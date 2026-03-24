import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import './App.css'

type EditorMode = 'source' | 'preview' | 'split'
type ThemeMode = 'dark' | 'light'

type VaultNote = {
  id: string
  path: string
  title: string
  content: string
  tags: string[]
  updatedAt: string
}

type WorkspaceCommand = {
  id: string
  name: string
  hotkey: string
  description: string
  run: () => void
}

const INITIAL_NOTES: VaultNote[] = [
  {
    id: 'note-inbox',
    path: '00 Inbox/Agent Ops Inbox.md',
    title: 'Agent Ops Inbox',
    tags: ['#inbox', '#capture'],
    updatedAt: '2026-03-24 09:10',
    content: `# Agent Ops Inbox

- [ ] Convert daily standup notes into Task objects
- [ ] Review FR-ED and FR-WV implementation deltas
- [ ] Verify command bus coverage for editor actions

Linked context:
- [[Project Dossier]]
- [[Policy Guardrails]]
- [[Command Surfaces]]`,
  },
  {
    id: 'note-dossier',
    path: '01 Projects/Thoughtforge/Project Dossier.md',
    title: 'Project Dossier',
    tags: ['#project', '#dossier'],
    updatedAt: '2026-03-24 09:04',
    content: `# Project Dossier

## Goal
Deliver an Obsidian-class workspace with superior agent context fidelity.

## Current State
- UI shell supports files, tabs, backlinks, quick switcher, and command palette.
- Runtime can compile resume and handoff bundles.

## References
- [[Agent Context Model]]
- [[Policy Guardrails]]
- [[Command Surfaces]]`,
  },
  {
    id: 'note-policy',
    path: '01 Projects/Thoughtforge/Policy Guardrails.md',
    title: 'Policy Guardrails',
    tags: ['#policy', '#safety'],
    updatedAt: '2026-03-24 08:55',
    content: `# Policy Guardrails

Non-negotiables:
- External side effects require explicit approval.
- Memory promotion to canonical requires provenance.
- Agent actions must cite bundle IDs.

Review with:
- [[Project Dossier]]
- [[Agent Context Model]]`,
  },
  {
    id: 'note-context-model',
    path: '02 Models/Agent Context Model.md',
    title: 'Agent Context Model',
    tags: ['#model', '#context'],
    updatedAt: '2026-03-24 08:42',
    content: `# Agent Context Model

Core objects:
- Intent
- Project
- Task
- Decision
- Commitment
- Constraint

Operational views:
- Working set
- State deltas
- Approvals queue

See also [[Command Surfaces]].`,
  },
  {
    id: 'note-commands',
    path: '02 Models/Command Surfaces.md',
    title: 'Command Surfaces',
    tags: ['#command-bus', '#interop'],
    updatedAt: '2026-03-24 08:33',
    content: `# Command Surfaces

Expected command IDs:
- command-palette:open
- switcher:open
- file-explorer:new-file
- markdown:toggle-preview
- workspace:split-vertical

Linked from [[Project Dossier]] and [[Agent Context Model]].`,
  },
]

const LAYOUT_STORAGE_KEY = 'thoughtforge.workspace.layout.v1'
const COMMAND_BINDINGS_KEY = 'thoughtforge.command.bindings.v1'

type PersistedWorkspaceLayout = {
  notes: VaultNote[]
  activeNoteId: string
  openTabs: string[]
  pinnedTabs: string[]
  recentNotes: string[]
  historyBack: string[]
  historyForward: string[]
  leftSidebarVisible: boolean
  rightSidebarVisible: boolean
  editorMode: EditorMode
  theme: ThemeMode
  commandHistory: string[]
}

type CommandBindings = Record<string, string>

function loadPersistedLayout(): PersistedWorkspaceLayout | null {
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) {
      return null
    }
    return JSON.parse(raw) as PersistedWorkspaceLayout
  } catch {
    return null
  }
}

function savePersistedLayout(layout: PersistedWorkspaceLayout): void {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  } catch {
    // no-op: best effort persistence
  }
}

function loadCommandBindings(): CommandBindings {
  try {
    const raw = window.localStorage.getItem(COMMAND_BINDINGS_KEY)
    if (!raw) {
      return {}
    }
    const parsed = JSON.parse(raw) as CommandBindings
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveCommandBindings(bindings: CommandBindings): void {
  try {
    window.localStorage.setItem(COMMAND_BINDINGS_KEY, JSON.stringify(bindings))
  } catch {
    // no-op: best effort persistence
  }
}

function normalizeLink(raw: string): string {
  const noAlias = raw.split('|')[0] ?? raw
  const noAnchor = noAlias.split('#')[0] ?? noAlias
  return noAnchor.trim().replace(/^\.\//, '').replace(/\.md$/i, '').toLowerCase()
}

function extractLinks(markdown: string): string[] {
  const links = new Set<string>()
  const wikiPattern = /\[\[([^[\]]+)\]\]/g
  let match = wikiPattern.exec(markdown)
  while (match) {
    links.add(normalizeLink(match[1] ?? ''))
    match = wikiPattern.exec(markdown)
  }
  return [...links]
}

function noteAliases(note: VaultNote): string[] {
  const stem = note.path.split('/').pop()?.replace(/\.md$/i, '') ?? note.title
  return [normalizeLink(note.path), normalizeLink(note.title), normalizeLink(stem)]
}

function formatNow(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  return target.tagName === 'TEXTAREA' || target.tagName === 'INPUT'
}

function hotkeyMatches(event: KeyboardEvent, hotkey: string): boolean {
  const tokens = hotkey
    .toLowerCase()
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean)
  if (tokens.length === 0) {
    return false
  }

  const expected = {
    mod: tokens.includes('mod'),
    shift: tokens.includes('shift'),
    alt: tokens.includes('alt'),
    key: tokens.find(
      (token) => token !== 'mod' && token !== 'shift' && token !== 'alt' && token !== 'cmdorctrl',
    ),
  }
  const modPressed = event.metaKey || event.ctrlKey
  if (expected.mod !== modPressed) {
    return false
  }
  if (expected.shift !== event.shiftKey) {
    return false
  }
  if (expected.alt !== event.altKey) {
    return false
  }
  if (!expected.key) {
    return true
  }

  const normalizedKey = event.key.toLowerCase()
  if (expected.key === 'left') {
    return normalizedKey === 'arrowleft'
  }
  if (expected.key === 'right') {
    return normalizedKey === 'arrowright'
  }
  if (expected.key === 'backslash') {
    return normalizedKey === '\\'
  }
  return normalizedKey === expected.key
}

function renderMarkdown(markdown: string): React.ReactNode[] {
  const lines = markdown.split('\n')
  const nodes: React.ReactNode[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let index = 0

  for (const line of lines) {
    index += 1

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <pre className="md-code" key={`code-${index}`}>
            <code>{codeLines.join('\n')}</code>
          </pre>,
        )
        codeLines = []
        inCodeBlock = false
      } else {
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h3 className="md-h3" key={`h3-${index}`}>
          {line.slice(4)}
        </h3>,
      )
      continue
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 className="md-h2" key={`h2-${index}`}>
          {line.slice(3)}
        </h2>,
      )
      continue
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 className="md-h1" key={`h1-${index}`}>
          {line.slice(2)}
        </h1>,
      )
      continue
    }
    if (line.startsWith('- [ ] ')) {
      nodes.push(
        <div className="md-check" key={`todo-${index}`}>
          <input type="checkbox" readOnly checked={false} />
          <span>{line.slice(6)}</span>
        </div>,
      )
      continue
    }
    if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      nodes.push(
        <div className="md-check" key={`done-${index}`}>
          <input type="checkbox" readOnly checked />
          <span>{line.slice(6)}</span>
        </div>,
      )
      continue
    }
    if (line.startsWith('- ')) {
      nodes.push(
        <div className="md-bullet" key={`li-${index}`}>
          <span className="md-dot">•</span>
          <span>{line.slice(2)}</span>
        </div>,
      )
      continue
    }
    if (line.trim() === '') {
      nodes.push(<div className="md-gap" key={`gap-${index}`} />)
      continue
    }
    nodes.push(
      <p className="md-p" key={`p-${index}`}>
        {line}
      </p>,
    )
  }

  if (codeLines.length > 0) {
    nodes.push(
      <pre className="md-code" key="code-tail">
        <code>{codeLines.join('\n')}</code>
      </pre>,
    )
  }

  return nodes
}

function App() {
  const [bootLayout] = useState<PersistedWorkspaceLayout | null>(() => loadPersistedLayout())
  const [persistedBindings, setPersistedBindings] = useState<CommandBindings>(() =>
    loadCommandBindings(),
  )

  const bootNotes = bootLayout?.notes?.length ? bootLayout.notes : INITIAL_NOTES
  const fallbackNoteId = bootNotes[0]?.id ?? ''
  const bootActiveNoteId =
    bootLayout?.activeNoteId && bootNotes.some((note) => note.id === bootLayout.activeNoteId)
      ? bootLayout.activeNoteId
      : fallbackNoteId
  const bootOpenTabs =
    bootLayout?.openTabs?.filter((tabId) => bootNotes.some((note) => note.id === tabId)) ?? []
  const resolvedOpenTabs = bootOpenTabs.length > 0 ? bootOpenTabs : [bootActiveNoteId]

  const [notes, setNotes] = useState<VaultNote[]>(bootNotes)
  const [activeNoteId, setActiveNoteId] = useState<string>(bootActiveNoteId)
  const [openTabs, setOpenTabs] = useState<string[]>(resolvedOpenTabs)
  const [pinnedTabs, setPinnedTabs] = useState<string[]>(bootLayout?.pinnedTabs ?? [])
  const [recentNotes, setRecentNotes] = useState<string[]>(bootLayout?.recentNotes ?? [])
  const [historyBack, setHistoryBack] = useState<string[]>(bootLayout?.historyBack ?? [])
  const [historyForward, setHistoryForward] = useState<string[]>(bootLayout?.historyForward ?? [])
  const [leftSidebarVisible, setLeftSidebarVisible] = useState<boolean>(
    bootLayout?.leftSidebarVisible ?? true,
  )
  const [rightSidebarVisible, setRightSidebarVisible] = useState<boolean>(
    bootLayout?.rightSidebarVisible ?? true,
  )
  const [editorMode, setEditorMode] = useState<EditorMode>(bootLayout?.editorMode ?? 'source')
  const [theme, setTheme] = useState<ThemeMode>(bootLayout?.theme ?? 'dark')
  const [explorerQuery, setExplorerQuery] = useState<string>('')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false)
  const [commandQuery, setCommandQuery] = useState<string>('')
  const [quickSwitcherOpen, setQuickSwitcherOpen] = useState<boolean>(false)
  const [quickSwitcherQuery, setQuickSwitcherQuery] = useState<string>('')
  const [statusLine, setStatusLine] = useState<string>('Ready')
  const [commandHistory, setCommandHistory] = useState<string[]>(bootLayout?.commandHistory ?? [])

  const deferredExplorerQuery = useDeferredValue(explorerQuery)
  const deferredCommandQuery = useDeferredValue(commandQuery)
  const deferredQuickSwitcherQuery = useDeferredValue(quickSwitcherQuery)

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? notes[0]
  const activeAliases = activeNote ? noteAliases(activeNote) : []
  const activeLinks = activeNote ? extractLinks(activeNote.content) : []
  const notesById = new Map(notes.map((note) => [note.id, note]))

  const backlinks = notes.filter((note) => {
    if (!activeNote || note.id === activeNote.id) {
      return false
    }
    const links = extractLinks(note.content)
    return links.some((value) => activeAliases.includes(value))
  })

  const explorerItems = notes.filter((note) => {
    if (deferredExplorerQuery.trim() === '') {
      return true
    }
    const value = deferredExplorerQuery.toLowerCase()
    return note.title.toLowerCase().includes(value) || note.path.toLowerCase().includes(value)
  })

  const quickSwitchItems = notes.filter((note) => {
    if (deferredQuickSwitcherQuery.trim() === '') {
      return true
    }
    const value = deferredQuickSwitcherQuery.toLowerCase()
    return note.title.toLowerCase().includes(value) || note.path.toLowerCase().includes(value)
  })

  function openNote(noteId: string, source: string, trackHistory = true): void {
    startTransition(() => {
      if (trackHistory && activeNoteId && activeNoteId !== noteId) {
        setHistoryBack((current) => [...current, activeNoteId].slice(-50))
        setHistoryForward([])
      }
      setActiveNoteId(noteId)
      setOpenTabs((current) => (current.includes(noteId) ? current : [...current, noteId]))
      setRecentNotes((current) => [noteId, ...current.filter((value) => value !== noteId)].slice(0, 20))
      setStatusLine(`Opened ${source}`)
    })
  }

  function navigateBack(): void {
    setHistoryBack((current) => {
      if (current.length === 0) {
        return current
      }
      const previous = current[current.length - 1]
      if (activeNoteId) {
        setHistoryForward((forward) => [activeNoteId, ...forward].slice(0, 50))
      }
      openNote(previous, 'history back', false)
      return current.slice(0, -1)
    })
  }

  function navigateForward(): void {
    setHistoryForward((current) => {
      if (current.length === 0) {
        return current
      }
      const [next, ...rest] = current
      if (activeNoteId) {
        setHistoryBack((back) => [...back, activeNoteId].slice(-50))
      }
      openNote(next, 'history forward', false)
      return rest
    })
  }

  function closeTab(noteId: string): void {
    if (pinnedTabs.includes(noteId)) {
      setStatusLine('Unpin tab before closing')
      return
    }
    setOpenTabs((current) => {
      if (current.length <= 1) {
        return current
      }
      const next = current.filter((item) => item !== noteId)
      if (noteId === activeNoteId) {
        setActiveNoteId(next[0] ?? '')
      }
      return next
    })
  }

  function createNote(): void {
    let nextIndex = notes.length + 1
    let slug = `captured-${nextIndex}`
    while (notes.some((note) => note.id === `note-${slug}`)) {
      nextIndex += 1
      slug = `captured-${nextIndex}`
    }
    const nextNote: VaultNote = {
      id: `note-${slug}`,
      path: `00 Inbox/${slug}.md`,
      title: `Captured ${nextIndex}`,
      tags: ['#inbox'],
      updatedAt: formatNow(),
      content: `# Captured\n\nStart writing...\n`,
    }
    startTransition(() => {
      setNotes((current) => [nextNote, ...current])
      setOpenTabs((current) => [nextNote.id, ...current])
      setActiveNoteId(nextNote.id)
      setStatusLine('Created new note')
    })
  }

  function updateActiveContent(content: string): void {
    if (!activeNote) {
      return
    }
    setNotes((current) =>
      current.map((note) =>
        note.id === activeNote.id ? { ...note, content, updatedAt: formatNow() } : note,
      ),
    )
    setStatusLine(`Autosaved ${activeNote.title}`)
  }

  function togglePin(noteId: string): void {
    setPinnedTabs((current) => {
      if (current.includes(noteId)) {
        return current.filter((value) => value !== noteId)
      }
      return [...current, noteId]
    })
  }

  function executeCommand(command: WorkspaceCommand): void {
    command.run()
    setCommandPaletteOpen(false)
    setCommandQuery('')
    setCommandHistory((current) => [`${command.id} (${command.hotkey})`, ...current].slice(0, 8))
    setStatusLine(`Executed ${command.id}`)
  }

  function commandHotkey(commandId: string, fallback: string): string {
    return persistedBindings[commandId] ?? fallback
  }

  function updateCommandBinding(commandId: string, value: string): void {
    const normalized = value.trim()
    setPersistedBindings((current) => {
      const next: CommandBindings = { ...current }
      if (!normalized) {
        delete next[commandId]
      } else {
        next[commandId] = normalized
      }
      saveCommandBindings(next)
      return next
    })
    setStatusLine(`Updated hotkey for ${commandId}`)
  }

  const commands: WorkspaceCommand[] = [
    {
      id: 'command-palette:open',
      name: 'Open command palette',
      hotkey: commandHotkey('command-palette:open', 'Mod+P'),
      description: 'Search and execute workspace commands',
      run: () => setCommandPaletteOpen(true),
    },
    {
      id: 'switcher:open',
      name: 'Open quick switcher',
      hotkey: commandHotkey('switcher:open', 'Mod+O'),
      description: 'Find and open a note by title',
      run: () => setQuickSwitcherOpen(true),
    },
    {
      id: 'app:go-back',
      name: 'Go back',
      hotkey: commandHotkey('app:go-back', 'Mod+['),
      description: 'Open previous note from navigation history',
      run: () => navigateBack(),
    },
    {
      id: 'app:go-forward',
      name: 'Go forward',
      hotkey: commandHotkey('app:go-forward', 'Mod+]'),
      description: 'Open next note from navigation history',
      run: () => navigateForward(),
    },
    {
      id: 'file-explorer:new-file',
      name: 'Create new note',
      hotkey: commandHotkey('file-explorer:new-file', 'Mod+N'),
      description: 'Create a markdown note in inbox',
      run: () => createNote(),
    },
    {
      id: 'markdown:toggle-preview',
      name: 'Toggle source/preview mode',
      hotkey: commandHotkey('markdown:toggle-preview', 'Mod+E'),
      description: 'Switch editor mode',
      run: () =>
        setEditorMode((mode) => {
          if (mode === 'source') {
            return 'preview'
          }
          if (mode === 'preview') {
            return 'split'
          }
          return 'source'
        }),
    },
    {
      id: 'workspace:split-vertical',
      name: 'Open split editor',
      hotkey: commandHotkey('workspace:split-vertical', 'Mod+Backslash'),
      description: 'Show source and preview side by side',
      run: () => setEditorMode('split'),
    },
    {
      id: 'app:toggle-left-sidebar',
      name: 'Toggle left sidebar',
      hotkey: commandHotkey('app:toggle-left-sidebar', 'Mod+Alt+Left'),
      description: 'Show or hide file navigation',
      run: () => setLeftSidebarVisible((value) => !value),
    },
    {
      id: 'app:toggle-right-sidebar',
      name: 'Toggle right sidebar',
      hotkey: commandHotkey('app:toggle-right-sidebar', 'Mod+Alt+Right'),
      description: 'Show or hide backlinks and inspector',
      run: () => setRightSidebarVisible((value) => !value),
    },
    {
      id: 'theme:toggle-light-dark',
      name: 'Toggle theme',
      hotkey: commandHotkey('theme:toggle-light-dark', 'Mod+Shift+L'),
      description: 'Switch dark and light UI modes',
      run: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
    },
  ]

  const filteredCommands = commands.filter((command) => {
    if (deferredCommandQuery.trim() === '') {
      return true
    }
    const value = deferredCommandQuery.toLowerCase()
    return (
      command.id.toLowerCase().includes(value) ||
      command.name.toLowerCase().includes(value) ||
      command.description.toLowerCase().includes(value)
    )
  })

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const keyboundCommands = commands
      .filter((command) => command.hotkey.trim() !== '')
      .map((command) => ({ id: command.id, hotkey: command.hotkey }))

    function onKeyDown(event: KeyboardEvent): void {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }
      if (isEditableTarget(event.target)) {
        const safeInEditor = ['file-explorer:new-file']
        const matched = keyboundCommands.find((entry) => hotkeyMatches(event, entry.hotkey))
        if (matched && safeInEditor.includes(matched.id)) {
          event.preventDefault()
          const command = commands.find((item) => item.id === matched.id)
          if (command) {
            executeCommand(command)
          }
        }
        return
      }

      const matched = keyboundCommands.find((entry) => hotkeyMatches(event, entry.hotkey))
      if (!matched) {
        return
      }
      const command = commands.find((item) => item.id === matched.id)
      if (command) {
        event.preventDefault()
        executeCommand(command)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  })

  useEffect(() => {
    savePersistedLayout({
      notes,
      activeNoteId,
      openTabs,
      pinnedTabs,
      recentNotes,
      historyBack,
      historyForward,
      leftSidebarVisible,
      rightSidebarVisible,
      editorMode,
      theme,
      commandHistory,
    })
  }, [
    notes,
    activeNoteId,
    openTabs,
    pinnedTabs,
    recentNotes,
    historyBack,
    historyForward,
    leftSidebarVisible,
    rightSidebarVisible,
    editorMode,
    theme,
    commandHistory,
  ])

  const folderGroups = explorerItems.reduce<Record<string, VaultNote[]>>((acc, note) => {
    const folder =
      note.path.split('/').slice(0, -1).join('/') ||
      note.path.split('/').slice(0, 1).join('/') ||
      'Root'
    acc[folder] = acc[folder] ?? []
    acc[folder].push(note)
    return acc
  }, {})
  const folderEntries = Object.entries(folderGroups).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className="tf-shell">
      <header className="topbar">
        <div className="topbar-left">
          <strong className="brand">Thoughtforge</strong>
          <span className="vault-name">Vault: Thoughtforge Core</span>
          <span className="meta-pill">Obsidian-class workspace shell</span>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => navigateBack()}>
            Back
          </button>
          <button type="button" onClick={() => navigateForward()}>
            Forward
          </button>
          <button type="button" onClick={() => setQuickSwitcherOpen(true)}>
            Quick Switcher
          </button>
          <button type="button" onClick={() => setCommandPaletteOpen(true)}>
            Command Palette
          </button>
          <button type="button" onClick={() => createNote()}>
            New Note
          </button>
        </div>
      </header>

      <section className="workspace">
        {leftSidebarVisible && (
          <aside className="sidebar sidebar-left">
            <div className="panel-title">
              <h2>Files</h2>
              <button type="button" onClick={() => setLeftSidebarVisible(false)}>
                Hide
              </button>
            </div>
            <input
              className="search-input"
              type="text"
              value={explorerQuery}
              onChange={(event) => setExplorerQuery(event.target.value)}
              placeholder="Search title or path"
            />
            <div className="folder-tree">
              {folderEntries.map(([folder, folderNotes]) => (
                <section key={folder} className="folder-group">
                  <h3>{folder}</h3>
                  {folderNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      className={note.id === activeNoteId ? 'note-row is-active' : 'note-row'}
                      onClick={() => openNote(note.id, note.title)}
                    >
                      <span>{note.title}</span>
                      <small>{note.updatedAt}</small>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </aside>
        )}

        <section className="editor-shell">
          <div className="tabbar">
            {openTabs.map((tabId) => {
              const note = notesById.get(tabId)
              if (!note) {
                return null
              }
              const pinned = pinnedTabs.includes(tabId)
              return (
                <div key={tabId} className={tabId === activeNoteId ? 'tab is-active' : 'tab'}>
                  <button type="button" onClick={() => openNote(tabId, note.title)}>
                    {note.title}
                  </button>
                  <button
                    type="button"
                    className={pinned ? 'tab-pin is-pinned' : 'tab-pin'}
                    onClick={() => togglePin(tabId)}
                    title={pinned ? 'Unpin tab' : 'Pin tab'}
                  >
                    {pinned ? 'P' : 'p'}
                  </button>
                  <button type="button" className="tab-close" onClick={() => closeTab(tabId)}>
                    ×
                  </button>
                </div>
              )
            })}
          </div>

          <div className="editor-toolbar">
            <div className="editor-mode">
              <button
                type="button"
                className={editorMode === 'source' ? 'is-active' : ''}
                onClick={() => setEditorMode('source')}
              >
                Source
              </button>
              <button
                type="button"
                className={editorMode === 'preview' ? 'is-active' : ''}
                onClick={() => setEditorMode('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className={editorMode === 'split' ? 'is-active' : ''}
                onClick={() => setEditorMode('split')}
              >
                Split
              </button>
            </div>
            <div className="editor-mode">
              <button type="button" onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}>
                Theme: {theme}
              </button>
              <button type="button" onClick={() => setRightSidebarVisible((value) => !value)}>
                Inspector
              </button>
            </div>
          </div>

          {activeNote ? (
            <div className={editorMode === 'split' ? 'editor-panels split' : 'editor-panels'}>
              {(editorMode === 'source' || editorMode === 'split') && (
                <textarea
                  className="source-editor"
                  value={activeNote.content}
                  onChange={(event) => updateActiveContent(event.target.value)}
                  spellCheck={false}
                />
              )}
              {(editorMode === 'preview' || editorMode === 'split') && (
                <article className="preview-pane">{renderMarkdown(activeNote.content)}</article>
              )}
            </div>
          ) : (
            <div className="empty-state">No note selected</div>
          )}
        </section>

        {rightSidebarVisible && (
          <aside className="sidebar sidebar-right">
            <div className="panel-title">
              <h2>Inspector</h2>
              <button type="button" onClick={() => setRightSidebarVisible(false)}>
                Hide
              </button>
            </div>
            {activeNote ? (
              <>
                <section className="inspector-card">
                  <h3>Properties</h3>
                  <p>
                    <strong>Path:</strong> {activeNote.path}
                  </p>
                  <p>
                    <strong>Updated:</strong> {activeNote.updatedAt}
                  </p>
                  <p>
                    <strong>Tags:</strong> {activeNote.tags.join(' ')}
                  </p>
                  <p>
                    <strong>Words:</strong> {activeNote.content.split(/\s+/).filter(Boolean).length}
                  </p>
                </section>

                <section className="inspector-card">
                  <h3>Outgoing Links</h3>
                  <ul>
                    {activeLinks.length === 0 && <li className="muted">No outgoing links</li>}
                    {activeLinks.map((link) => (
                      <li key={link}>{link}</li>
                    ))}
                  </ul>
                </section>

                <section className="inspector-card">
                  <h3>Backlinks</h3>
                  <ul>
                    {backlinks.length === 0 && <li className="muted">No backlinks</li>}
                    {backlinks.map((note) => (
                      <li key={note.id}>
                        <button type="button" className="inline-link" onClick={() => openNote(note.id, note.title)}>
                          {note.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="inspector-card">
                  <h3>Recent Commands</h3>
                  <ul>
                    {commandHistory.length === 0 && <li className="muted">No commands yet</li>}
                    {commandHistory.map((entry) => (
                      <li key={entry}>{entry}</li>
                    ))}
                  </ul>
                </section>

                <section className="inspector-card">
                  <h3>Recent Files</h3>
                  <ul>
                    {recentNotes.length === 0 && <li className="muted">No recent files</li>}
                    {recentNotes.map((noteId) => {
                      const note = notesById.get(noteId)
                      if (!note) {
                        return null
                      }
                      return (
                        <li key={noteId}>
                          <button
                            type="button"
                            className="inline-link"
                            onClick={() => openNote(noteId, note.title)}
                          >
                            {note.title}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>

                <section className="inspector-card">
                  <h3>Keybindings</h3>
                  <div className="binding-grid">
                    {commands.slice(0, 6).map((command) => (
                      <label key={command.id} className="binding-row">
                        <span>{command.name}</span>
                        <input
                          type="text"
                          value={persistedBindings[command.id] ?? command.hotkey}
                          onChange={(event) =>
                            updateCommandBinding(command.id, event.target.value)
                          }
                        />
                      </label>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <p className="muted">Select a note to inspect.</p>
            )}
          </aside>
        )}
      </section>

      <footer className="statusbar">
        <span>{statusLine}</span>
        <span>{notes.length} notes indexed</span>
        <span>Mode: {editorMode}</span>
      </footer>

      {commandPaletteOpen && (
        <div className="overlay" onClick={() => setCommandPaletteOpen(false)} role="presentation">
          <section className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Command Palette</h2>
              <button type="button" onClick={() => setCommandPaletteOpen(false)}>
                Close
              </button>
            </header>
            <input
              autoFocus
              className="search-input"
              type="text"
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Search commands by id, name, or description"
            />
            <div className="modal-list">
              {filteredCommands.map((command) => (
                <button key={command.id} type="button" className="command-row" onClick={() => executeCommand(command)}>
                  <div>
                    <strong>{command.name}</strong>
                    <p>{command.description}</p>
                    <small>{command.id}</small>
                  </div>
                  <kbd>{command.hotkey}</kbd>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {quickSwitcherOpen && (
        <div className="overlay" onClick={() => setQuickSwitcherOpen(false)} role="presentation">
          <section className="modal switcher" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <header>
              <h2>Quick Switcher</h2>
              <button type="button" onClick={() => setQuickSwitcherOpen(false)}>
                Close
              </button>
            </header>
            <input
              autoFocus
              className="search-input"
              type="text"
              value={quickSwitcherQuery}
              onChange={(event) => setQuickSwitcherQuery(event.target.value)}
              placeholder="Type to open a note"
            />
            <div className="modal-list">
              {quickSwitchItems.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  className="command-row"
                  onClick={() => {
                    openNote(note.id, note.title)
                    setQuickSwitcherOpen(false)
                    setQuickSwitcherQuery('')
                  }}
                >
                  <div>
                    <strong>{note.title}</strong>
                    <p>{note.path}</p>
                  </div>
                  <small>{note.updatedAt}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
