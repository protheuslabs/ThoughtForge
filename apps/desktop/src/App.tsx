import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
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
}

type CaptureTarget = 'inbox' | 'daily' | 'active'

type DailyNoteConfig = {
  folder: string
  fileNamePattern: string
  headingTemplate: string
}

type MetadataField = {
  key: string
  value: string
}

type NoteReference = {
  raw: string
  target: string
  blockId: string | null
  embedded: boolean
}

type SlashCommand = {
  id: string
  name: string
  description: string
  keywords: string[]
  insert: (now: Date) => string
}

type SlashState = {
  isOpen: boolean
  query: string
  replaceStart: number
  replaceEnd: number
}

type RibbonAction = {
  id: string
  label: string
  glyph: string
  description: string
}

type EditorPane = {
  id: string
  tabIds: string[]
  activeNoteId: string
}

type DesktopVaultSummary = {
  id: string
  name: string
  rootPath: string
  lastOpenedAt: number
  isActive: boolean
}

type DesktopNoteSnapshot = {
  id: string
  path: string
  title: string
  tags: string[]
  links: string[]
  content: string
  updatedAt?: number
}

type DesktopVaultSnapshot = {
  id: string
  name: string
  rootPath: string
  notes: DesktopNoteSnapshot[]
}

type DesktopWorkspaceState = {
  isMacos: boolean
  registryPath: string
  activeVaultId: string | null
  vaults: DesktopVaultSummary[]
  activeVault: DesktopVaultSnapshot | null
}

type DesktopCaptureResponse = {
  result: {
    target: 'inbox' | 'daily' | 'selected_note'
    note_path: string
    created_note: boolean
    appended_text: string
  }
  note: DesktopNoteSnapshot
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
const DAILY_NOTE_CONFIG_KEY = 'thoughtforge.capture.daily.v1'
const MAIN_EDITOR_PANE_ID = 'pane-main'

const DEFAULT_DAILY_NOTE_CONFIG: DailyNoteConfig = {
  folder: '00 Daily',
  fileNamePattern: '%Y-%m-%d',
  headingTemplate: '# Daily Note - {date}',
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'slash:task',
    name: 'Task',
    description: 'Insert an unchecked task item',
    keywords: ['todo', 'task', 'checklist'],
    insert: () => '- [ ] ',
  },
  {
    id: 'slash:callout-info',
    name: 'Callout (Info)',
    description: 'Insert an info callout block',
    keywords: ['callout', 'info', 'note'],
    insert: () => '> [!info] Context\n> \n',
  },
  {
    id: 'slash:decision',
    name: 'Decision Block',
    description: 'Insert a structured decision template',
    keywords: ['decision', 'rationale', 'adr'],
    insert: () => '## Decision\nstatus:: proposed\nrationale:: \nalternatives:: \n',
  },
  {
    id: 'slash:evidence',
    name: 'Evidence Excerpt',
    description: 'Insert evidence metadata and quote scaffold',
    keywords: ['evidence', 'excerpt', 'source'],
    insert: () => 'source:: \ncaptured_at:: \n\n> \n',
  },
  {
    id: 'slash:block-anchor',
    name: 'Block Anchor',
    description: 'Insert a stable block anchor marker',
    keywords: ['block', 'anchor', 'reference'],
    insert: (now) => ` ^block-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`,
  },
]

const RIBBON_PRIMARY_ACTIONS: RibbonAction[] = [
  {
    id: 'app:toggle-left-sidebar',
    label: 'Files',
    glyph: 'F',
    description: 'Toggle file explorer',
  },
  {
    id: 'switcher:open',
    label: 'Search',
    glyph: 'S',
    description: 'Open quick switcher',
  },
  {
    id: 'graph:open-view',
    label: 'Graph',
    glyph: 'G',
    description: 'Open relationship graph',
  },
  {
    id: 'command-palette:open',
    label: 'Commands',
    glyph: 'C',
    description: 'Open command palette',
  },
  {
    id: 'vaults:open-modal',
    label: 'Vaults',
    glyph: 'V',
    description: 'Open vault manager',
  },
]

const RIBBON_SECONDARY_ACTIONS: RibbonAction[] = [
  {
    id: 'capture:append-inbox',
    label: 'Capture',
    glyph: 'I',
    description: 'Capture to inbox',
  },
  {
    id: 'daily-note:open-today',
    label: 'Daily',
    glyph: 'D',
    description: 'Open daily note',
  },
  {
    id: 'app:toggle-right-sidebar',
    label: 'Inspector',
    glyph: 'R',
    description: 'Toggle right sidebar',
  },
  {
    id: 'theme:toggle-light-dark',
    label: 'Theme',
    glyph: 'T',
    description: 'Toggle theme',
  },
  {
    id: 'settings:open',
    label: 'Settings',
    glyph: 'P',
    description: 'Open workspace settings',
  },
]

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

function loadDailyNoteConfig(): DailyNoteConfig {
  try {
    const raw = window.localStorage.getItem(DAILY_NOTE_CONFIG_KEY)
    if (!raw) {
      return DEFAULT_DAILY_NOTE_CONFIG
    }
    const parsed = JSON.parse(raw) as Partial<DailyNoteConfig>
    return {
      folder: parsed.folder?.trim() || DEFAULT_DAILY_NOTE_CONFIG.folder,
      fileNamePattern:
        parsed.fileNamePattern?.trim() || DEFAULT_DAILY_NOTE_CONFIG.fileNamePattern,
      headingTemplate:
        parsed.headingTemplate?.trim() || DEFAULT_DAILY_NOTE_CONFIG.headingTemplate,
    }
  } catch {
    return DEFAULT_DAILY_NOTE_CONFIG
  }
}

function saveDailyNoteConfig(config: DailyNoteConfig): void {
  try {
    window.localStorage.setItem(DAILY_NOTE_CONFIG_KEY, JSON.stringify(config))
  } catch {
    // no-op: best effort persistence
  }
}

function hasTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

function formatEpochSeconds(epochSeconds?: number): string {
  if (!epochSeconds) {
    return formatNow()
  }
  const date = new Date(epochSeconds * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

function fromDesktopNote(snapshot: DesktopNoteSnapshot): VaultNote {
  return {
    id: snapshot.id,
    path: snapshot.path,
    title: snapshot.title,
    content: snapshot.content,
    tags: snapshot.tags,
    updatedAt: formatEpochSeconds(snapshot.updatedAt),
  }
}

function normalizeLink(raw: string): string {
  const noAlias = raw.split('|')[0] ?? raw
  const noAnchor = noAlias.split('#')[0] ?? noAlias
  return noAnchor
    .trim()
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .replace(/\.md$/i, '')
    .toLowerCase()
}

function parseReferenceTarget(raw: string): { target: string; blockId: string | null } {
  const aliasStripped = (raw.split('|')[0] ?? raw).trim()
  const blockSplit = aliasStripped.split('#^')
  if (blockSplit.length > 1) {
    const target = normalizeLink(blockSplit[0] ?? '')
    const blockId = (blockSplit[1] ?? '').trim().toLowerCase()
    return { target, blockId: blockId || null }
  }
  const headingStripped = aliasStripped.split('#')[0] ?? aliasStripped
  return { target: normalizeLink(headingStripped), blockId: null }
}

function isExternalReference(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('mailto:') ||
    normalized.startsWith('obsidian://') ||
    normalized.startsWith('thoughtforge://')
  )
}

function extractReferences(markdown: string): NoteReference[] {
  const refs: NoteReference[] = []
  const dedup = new Set<string>()

  const wikiPattern = /\[\[([^[\]]+)\]\]/g
  let wikiMatch = wikiPattern.exec(markdown)
  while (wikiMatch) {
    const raw = (wikiMatch[1] ?? '').trim()
    const index = wikiMatch.index ?? 0
    const embedded = index > 0 && markdown[index - 1] === '!'
    const { target, blockId } = parseReferenceTarget(raw)
    if (target) {
      const dedupKey = `${target}|${blockId ?? ''}|${embedded}|${raw}`
      if (!dedup.has(dedupKey)) {
        dedup.add(dedupKey)
        refs.push({ raw, target, blockId, embedded })
      }
    }
    wikiMatch = wikiPattern.exec(markdown)
  }

  const mdPattern = /\]\(([^)]+)\)/g
  let mdMatch = mdPattern.exec(markdown)
  while (mdMatch) {
    const raw = (mdMatch[1] ?? '').trim()
    const endBracketIndex = (mdMatch.index ?? 0) + 1
    const openBracketIndex = markdown.lastIndexOf('[', endBracketIndex)
    const embedded = openBracketIndex > 0 && markdown[openBracketIndex - 1] === '!'
    if (!raw || isExternalReference(raw)) {
      mdMatch = mdPattern.exec(markdown)
      continue
    }
    const { target, blockId } = parseReferenceTarget(raw)
    if (target) {
      const dedupKey = `${target}|${blockId ?? ''}|${embedded}|${raw}`
      if (!dedup.has(dedupKey)) {
        dedup.add(dedupKey)
        refs.push({ raw, target, blockId, embedded })
      }
    }
    mdMatch = mdPattern.exec(markdown)
  }

  return refs
}

function extractLinks(markdown: string): string[] {
  const links = new Set<string>()
  for (const ref of extractReferences(markdown)) {
    if (ref.target) {
      links.add(ref.target)
    }
  }
  return [...links]
}

function extractFrontmatterFields(markdown: string): MetadataField[] {
  const lines = markdown.split('\n')
  if ((lines[0] ?? '').trim() !== '---') {
    return []
  }
  const fields: MetadataField[] = []
  let closed = false
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (line.trim() === '---') {
      closed = true
      break
    }
    const splitIndex = line.indexOf(':')
    if (splitIndex <= 0) {
      continue
    }
    const key = line.slice(0, splitIndex).trim()
    const value = line.slice(splitIndex + 1).trim()
    if (key && value) {
      fields.push({ key, value })
    }
  }
  return closed ? fields : []
}

function isMetadataKey(key: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(key)
}

function extractInlineMetadataFields(markdown: string): MetadataField[] {
  const fields: MetadataField[] = []
  let inFrontmatter = false
  let checkedFrontmatter = false
  let inCode = false
  const lines = markdown.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!checkedFrontmatter) {
      checkedFrontmatter = true
      if (trimmed === '---') {
        inFrontmatter = true
        continue
      }
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false
      }
      continue
    }
    if (trimmed.startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (inCode) {
      continue
    }

    const splitIndex = line.indexOf('::')
    if (splitIndex <= 0) {
      continue
    }
    const key = line.slice(0, splitIndex).trim()
    const value = line.slice(splitIndex + 2).trim()
    if (key && value && isMetadataKey(key)) {
      fields.push({ key, value })
    }
  }
  return fields
}

function extractBlockAnchors(markdown: string): string[] {
  const anchors = new Set<string>()
  let inCode = false
  for (const line of markdown.split('\n')) {
    const trimmed = line.trimEnd()
    if (trimmed.startsWith('```')) {
      inCode = !inCode
      continue
    }
    if (inCode || !trimmed.includes('^')) {
      continue
    }
    const anchorMatch = trimmed.match(/\^([A-Za-z0-9_-]+)\s*$/)
    if (anchorMatch?.[1]) {
      anchors.add(anchorMatch[1].toLowerCase())
    }
  }
  return [...anchors]
}

function formatDateByPattern(date: Date, pattern: string): string {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return pattern.replaceAll('%Y', year).replaceAll('%m', month).replaceAll('%d', day)
}

function dailyNotePathForDate(config: DailyNoteConfig, date: Date): string {
  const folder = config.folder.trim() || DEFAULT_DAILY_NOTE_CONFIG.folder
  const pattern = config.fileNamePattern.trim() || DEFAULT_DAILY_NOTE_CONFIG.fileNamePattern
  return `${folder}/${formatDateByPattern(date, pattern)}.md`
}

function dailyHeadingForDate(config: DailyNoteConfig, date: Date): string {
  const dateToken = formatDateByPattern(
    date,
    config.fileNamePattern.trim() || DEFAULT_DAILY_NOTE_CONFIG.fileNamePattern,
  )
  const template = config.headingTemplate.trim() || DEFAULT_DAILY_NOTE_CONFIG.headingTemplate
  return template.replaceAll('{date}', dateToken)
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
  const initialPaneTabs = resolvedOpenTabs.filter((tabId) => tabId !== '')
  const initialPaneActive = initialPaneTabs.includes(bootActiveNoteId)
    ? bootActiveNoteId
    : (initialPaneTabs[0] ?? '')

  const [notes, setNotes] = useState<VaultNote[]>(bootNotes)
  const [activeNoteId, setActiveNoteId] = useState<string>(initialPaneActive)
  const [openTabs, setOpenTabs] = useState<string[]>(initialPaneTabs)
  const [editorPanes, setEditorPanes] = useState<EditorPane[]>([
    {
      id: MAIN_EDITOR_PANE_ID,
      tabIds: initialPaneTabs,
      activeNoteId: initialPaneActive,
    },
  ])
  const [activePaneId, setActivePaneId] = useState<string>(MAIN_EDITOR_PANE_ID)
  const [paneSplitRatio, setPaneSplitRatio] = useState<number>(0.55)
  const [paneResizeActive, setPaneResizeActive] = useState<boolean>(false)
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
  const [graphOpen, setGraphOpen] = useState<boolean>(false)
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
  const [statusLine, setStatusLine] = useState<string>('Ready')
  const [commandHistory, setCommandHistory] = useState<string[]>(bootLayout?.commandHistory ?? [])
  const [isNativeDesktop] = useState<boolean>(() => hasTauriRuntime())
  const [isMacDesktop, setIsMacDesktop] = useState<boolean>(false)
  const [registryPath, setRegistryPath] = useState<string>('')
  const [activeVaultRoot, setActiveVaultRoot] = useState<string | null>(null)
  const [activeVaultName, setActiveVaultName] = useState<string>('Thoughtforge Core')
  const [knownVaults, setKnownVaults] = useState<DesktopVaultSummary[]>([])
  const [vaultModalOpen, setVaultModalOpen] = useState<boolean>(false)
  const [vaultPathInput, setVaultPathInput] = useState<string>('')
  const [vaultNameInput, setVaultNameInput] = useState<string>('')
  const [vaultActionBusy, setVaultActionBusy] = useState<boolean>(false)
  const [dailyNoteConfig, setDailyNoteConfig] = useState<DailyNoteConfig>(() =>
    loadDailyNoteConfig(),
  )
  const [captureOpen, setCaptureOpen] = useState<boolean>(false)
  const [captureText, setCaptureText] = useState<string>('')
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget>('inbox')
  const [slashState, setSlashState] = useState<SlashState>({
    isOpen: false,
    query: '',
    replaceStart: 0,
    replaceEnd: 0,
  })
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const paneDockRef = useRef<HTMLDivElement | null>(null)
  const pendingSaves = useRef<Record<string, number>>({})

  const deferredExplorerQuery = useDeferredValue(explorerQuery)
  const deferredCommandQuery = useDeferredValue(commandQuery)
  const deferredQuickSwitcherQuery = useDeferredValue(quickSwitcherQuery)

  const activeNote = notes.find((note) => note.id === activeNoteId) ?? notes[0]
  const activeAliases = activeNote ? noteAliases(activeNote) : []
  const activeLinks = activeNote ? extractLinks(activeNote.content) : []
  const activeReferences = activeNote ? extractReferences(activeNote.content) : []
  const activeEmbeds = activeReferences.filter((reference) => reference.embedded)
  const activeBlockReferences = activeReferences.filter((reference) => reference.blockId !== null)
  const activeFrontmatter = activeNote ? extractFrontmatterFields(activeNote.content) : []
  const activeInlineMetadata = activeNote ? extractInlineMetadataFields(activeNote.content) : []
  const activeBlockAnchors = activeNote ? extractBlockAnchors(activeNote.content) : []
  const notesById = new Map(notes.map((note) => [note.id, note]))

  const backlinks = notes.filter((note) => {
    if (!activeNote || note.id === activeNote.id) {
      return false
    }
    const links = extractLinks(note.content)
    return links.some((value) => activeAliases.includes(value))
  })

  const aliasToNoteId = notes.reduce<Record<string, string>>((acc, note) => {
    for (const alias of noteAliases(note)) {
      acc[alias] = note.id
    }
    return acc
  }, {})

  const graphEdges = notes.flatMap((note) =>
    extractLinks(note.content)
      .map((target) => {
        const targetId = aliasToNoteId[target]
        if (!targetId) {
          return null
        }
        return { sourceId: note.id, targetId }
      })
      .filter((edge): edge is { sourceId: string; targetId: string } => edge !== null),
  )
  const graphMetricsByNote = notes.reduce<
    Record<string, { incoming: number; outgoing: number }>
  >((acc, note) => {
    acc[note.id] = { incoming: 0, outgoing: 0 }
    return acc
  }, {})
  for (const edge of graphEdges) {
    if (graphMetricsByNote[edge.sourceId]) {
      graphMetricsByNote[edge.sourceId].outgoing += 1
    }
    if (graphMetricsByNote[edge.targetId]) {
      graphMetricsByNote[edge.targetId].incoming += 1
    }
  }
  const activeGraphNeighbors = activeNote
    ? [...new Set(
        graphEdges.flatMap((edge) => {
          if (edge.sourceId === activeNote.id) {
            return [edge.targetId]
          }
          if (edge.targetId === activeNote.id) {
            return [edge.sourceId]
          }
          return []
        }),
      )]
        .map((noteId) => notesById.get(noteId))
        .filter((note): note is VaultNote => Boolean(note))
    : []

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

  const filteredSlashCommands = SLASH_COMMANDS.filter((command) => {
    if (!slashState.query.trim()) {
      return true
    }
    const query = slashState.query.toLowerCase()
    return (
      command.name.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query) ||
      command.keywords.some((keyword) => keyword.includes(query))
    )
  })

  function commitPaneLayout(nextPanes: EditorPane[], nextActivePaneId?: string): void {
    const fallbackNoteId = notes[0]?.id ?? ''
    const normalizedPanes = (
      nextPanes.length > 0
        ? nextPanes
        : [
            {
              id: MAIN_EDITOR_PANE_ID,
              tabIds: fallbackNoteId ? [fallbackNoteId] : [],
              activeNoteId: fallbackNoteId,
            },
          ]
    ).map((pane, index) => {
      const dedupTabs = [...new Set(pane.tabIds)].filter((tabId) => tabId !== '')
      const tabIds = dedupTabs.length > 0 ? dedupTabs : (fallbackNoteId ? [fallbackNoteId] : [])
      const active = tabIds.includes(pane.activeNoteId) ? pane.activeNoteId : (tabIds[0] ?? '')
      return {
        id: pane.id || `pane-${index + 1}`,
        tabIds,
        activeNoteId: active,
      }
    })
    const focusedPane =
      normalizedPanes.find((pane) => pane.id === nextActivePaneId) ?? normalizedPanes[0]
    if (!focusedPane) {
      setEditorPanes(normalizedPanes)
      setActivePaneId(MAIN_EDITOR_PANE_ID)
      setOpenTabs([])
      setActiveNoteId('')
      return
    }
    setEditorPanes(normalizedPanes)
    setActivePaneId(focusedPane.id)
    setOpenTabs(focusedPane.tabIds)
    setActiveNoteId(focusedPane.activeNoteId)
  }

  function focusPane(paneId: string): void {
    const pane = editorPanes.find((item) => item.id === paneId)
    if (!pane) {
      return
    }
    const active = pane.tabIds.includes(pane.activeNoteId) ? pane.activeNoteId : (pane.tabIds[0] ?? '')
    setActivePaneId(pane.id)
    setOpenTabs(pane.tabIds)
    setActiveNoteId(active)
  }

  function splitActivePane(): void {
    if (editorPanes.length >= 2) {
      setStatusLine('Pane split already active')
      return
    }
    const sourcePane = editorPanes.find((pane) => pane.id === activePaneId) ?? editorPanes[0]
    if (!sourcePane || sourcePane.tabIds.length === 0) {
      setStatusLine('No tab available to split')
      return
    }
    const primaryNoteId = sourcePane.activeNoteId || sourcePane.tabIds[0]
    const splitPane: EditorPane = {
      id: `pane-split-${Date.now()}`,
      tabIds: [primaryNoteId],
      activeNoteId: primaryNoteId,
    }
    setPaneSplitRatio(0.55)
    commitPaneLayout([...editorPanes, splitPane], splitPane.id)
    setStatusLine('Split editor pane')
  }

  function closePane(paneId: string): void {
    if (editorPanes.length <= 1) {
      return
    }
    const paneToClose = editorPanes.find((pane) => pane.id === paneId)
    const remaining = editorPanes.filter((pane) => pane.id !== paneId)
    if (!paneToClose || remaining.length === 0) {
      return
    }
    const targetPane = remaining[0]
    const mergedTabs = [...targetPane.tabIds]
    for (const tabId of paneToClose.tabIds) {
      if (!mergedTabs.includes(tabId)) {
        mergedTabs.push(tabId)
      }
    }
    const mergedPane: EditorPane = {
      ...targetPane,
      tabIds: mergedTabs,
      activeNoteId: targetPane.activeNoteId || paneToClose.activeNoteId,
    }
    const nextPanes = [mergedPane, ...remaining.slice(1)]
    setPaneSplitRatio(0.55)
    commitPaneLayout(nextPanes, mergedPane.id)
    setStatusLine('Closed split pane')
  }

  function moveActiveTabToOtherPane(fromPaneId: string): void {
    if (editorPanes.length < 2) {
      return
    }
    const fromPane = editorPanes.find((pane) => pane.id === fromPaneId)
    const toPane = editorPanes.find((pane) => pane.id !== fromPaneId)
    if (!fromPane || !toPane || !fromPane.activeNoteId) {
      return
    }
    const movingId = fromPane.activeNoteId
    if (toPane.tabIds.includes(movingId)) {
      commitPaneLayout(
        editorPanes.map((pane) =>
          pane.id === toPane.id ? { ...pane, activeNoteId: movingId } : pane,
        ),
        toPane.id,
      )
      setStatusLine('Focused tab in adjacent pane')
      return
    }

    const fromRemainingTabs = fromPane.tabIds.filter((tabId) => tabId !== movingId)
    const toTabs = [...toPane.tabIds, movingId]
    const nextPanes = editorPanes
      .map((pane) => {
        if (pane.id === fromPane.id) {
          return {
            ...pane,
            tabIds: fromRemainingTabs,
            activeNoteId: fromRemainingTabs[0] ?? '',
          }
        }
        if (pane.id === toPane.id) {
          return {
            ...pane,
            tabIds: toTabs,
            activeNoteId: movingId,
          }
        }
        return pane
      })
      .filter((pane) => pane.tabIds.length > 0)
    commitPaneLayout(nextPanes, toPane.id)
    setStatusLine('Moved tab to adjacent pane')
  }

  function upsertNote(note: VaultNote, shouldOpen = false): void {
    setNotes((current) => {
      const existingIndex = current.findIndex((item) => item.id === note.id)
      if (existingIndex === -1) {
        return [note, ...current]
      }
      const next = [...current]
      next[existingIndex] = note
      return next
    })
    if (shouldOpen) {
      openNote(note.id, note.title)
    }
  }

  function applyDesktopState(workspace: DesktopWorkspaceState, source: string): void {
    setIsMacDesktop(workspace.isMacos)
    setRegistryPath(workspace.registryPath)
    setKnownVaults(workspace.vaults ?? [])
    if (!workspace.activeVault) {
      setActiveVaultRoot(null)
      setActiveVaultName('No vault selected')
      setStatusLine(`${source}: select a vault`)
      return
    }

    setActiveVaultRoot(workspace.activeVault.rootPath)
    setActiveVaultName(workspace.activeVault.name)
    const vaultNotes = workspace.activeVault.notes.map(fromDesktopNote)
    setNotes(vaultNotes)
    const nextActive = vaultNotes[0]?.id ?? ''
    const nextTabs = nextActive ? [nextActive] : []
    setEditorPanes([
      {
        id: MAIN_EDITOR_PANE_ID,
        tabIds: nextTabs,
        activeNoteId: nextActive,
      },
    ])
    setActivePaneId(MAIN_EDITOR_PANE_ID)
    setPaneSplitRatio(0.55)
    setActiveNoteId(nextActive)
    setOpenTabs(nextTabs)
    setRecentNotes(nextActive ? [nextActive] : [])
    setStatusLine(`${source}: ${workspace.activeVault.name}`)
  }

  async function bootstrapDesktopWorkspace(): Promise<void> {
    if (!isNativeDesktop) {
      return
    }
    try {
      const workspace = await invoke<DesktopWorkspaceState>('desktop_bootstrap')
      applyDesktopState(workspace, 'Desktop bootstrap complete')
    } catch (error) {
      setStatusLine(`Desktop bootstrap failed: ${String(error)}`)
    }
  }

  async function openVaultByPath(path: string, name?: string): Promise<void> {
    if (!isNativeDesktop) {
      setStatusLine('Vault open by path is available in desktop runtime')
      return
    }
    const trimmedPath = path.trim()
    if (!trimmedPath) {
      setStatusLine('Vault path is empty')
      return
    }

    setVaultActionBusy(true)
    try {
      const workspace = await invoke<DesktopWorkspaceState>('desktop_open_vault', {
        path: trimmedPath,
        name: name?.trim() || null,
      })
      applyDesktopState(workspace, 'Opened vault')
      setVaultModalOpen(false)
      setVaultPathInput('')
      setVaultNameInput('')
    } catch (error) {
      setStatusLine(`Failed to open vault: ${String(error)}`)
    } finally {
      setVaultActionBusy(false)
    }
  }

  async function switchVault(vaultId: string): Promise<void> {
    if (!isNativeDesktop) {
      return
    }
    setVaultActionBusy(true)
    try {
      const workspace = await invoke<DesktopWorkspaceState>('desktop_switch_vault', { vaultId })
      applyDesktopState(workspace, 'Switched vault')
      setVaultModalOpen(false)
    } catch (error) {
      setStatusLine(`Failed to switch vault: ${String(error)}`)
    } finally {
      setVaultActionBusy(false)
    }
  }

  function queueDesktopSave(notePath: string, content: string): void {
    if (!isNativeDesktop || !activeVaultRoot) {
      return
    }
    const key = notePath
    if (pendingSaves.current[key]) {
      window.clearTimeout(pendingSaves.current[key])
    }
    pendingSaves.current[key] = window.setTimeout(() => {
      void invoke('desktop_save_note', {
        vaultRoot: activeVaultRoot,
        notePath,
        content,
      }).catch((error) => {
        setStatusLine(`Desktop save failed: ${String(error)}`)
      })
    }, 320)
  }

  function openNote(
    noteId: string,
    source: string,
    trackHistory = true,
    targetPaneId = activePaneId,
  ): void {
    startTransition(() => {
      if (trackHistory && activeNoteId && activeNoteId !== noteId) {
        setHistoryBack((current) => [...current, activeNoteId].slice(-50))
        setHistoryForward([])
      }
      const destinationPane =
        editorPanes.find((pane) => pane.id === targetPaneId) ?? editorPanes[0]
      if (!destinationPane) {
        return
      }
      const nextPanes = editorPanes.map((pane) => {
        if (pane.id !== destinationPane.id) {
          return pane
        }
        const nextTabs = pane.tabIds.includes(noteId) ? pane.tabIds : [...pane.tabIds, noteId]
        return {
          ...pane,
          tabIds: nextTabs,
          activeNoteId: noteId,
        }
      })
      commitPaneLayout(nextPanes, destinationPane.id)
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

  function closeTab(noteId: string, paneId = activePaneId): void {
    if (pinnedTabs.includes(noteId)) {
      setStatusLine('Unpin tab before closing')
      return
    }
    const pane = editorPanes.find((item) => item.id === paneId)
    if (!pane) {
      return
    }
    const totalTabs = editorPanes.reduce((count, item) => count + item.tabIds.length, 0)
    if (totalTabs <= 1) {
      setStatusLine('At least one tab must remain open')
      return
    }

    if (pane.tabIds.length <= 1 && editorPanes.length > 1) {
      const remainingPanes = editorPanes.filter((item) => item.id !== pane.id)
      const focusPaneId = activePaneId === pane.id ? (remainingPanes[0]?.id ?? MAIN_EDITOR_PANE_ID) : activePaneId
      commitPaneLayout(remainingPanes, focusPaneId)
      setStatusLine('Closed pane')
      return
    }

    const nextPanes = editorPanes.map((item) => {
      if (item.id !== pane.id) {
        return item
      }
      const nextTabs = item.tabIds.filter((tabId) => tabId !== noteId)
      const nextActive = item.activeNoteId === noteId ? (nextTabs[0] ?? '') : item.activeNoteId
      return {
        ...item,
        tabIds: nextTabs,
        activeNoteId: nextActive,
      }
    })
    const focusPaneId = pane.id === activePaneId ? pane.id : activePaneId
    commitPaneLayout(nextPanes, focusPaneId)
  }

  function createNote(): void {
    if (isNativeDesktop && activeVaultRoot) {
      const timestamp = new Date().toISOString().slice(11, 19).replaceAll(':', '')
      const title = `Captured ${timestamp}`
      void invoke<DesktopNoteSnapshot>('desktop_create_note', {
        vaultRoot: activeVaultRoot,
        title,
        folder: '00 Inbox',
        body: 'Start writing...',
      })
        .then((snapshot) => {
          const note = fromDesktopNote(snapshot)
          upsertNote(note, true)
          openNote(note.id, note.title)
          setStatusLine(`Created note ${note.title}`)
        })
        .catch((error) => {
          setStatusLine(`Create note failed: ${String(error)}`)
        })
      return
    }

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
      openNote(nextNote.id, nextNote.title)
      setStatusLine('Created new note')
    })
  }

  function updateSlashState(content: string, cursor: number): void {
    const safeCursor = Math.max(0, Math.min(cursor, content.length))
    const lineStart = content.lastIndexOf('\n', Math.max(0, safeCursor - 1)) + 1
    const lineUntilCursor = content.slice(lineStart, safeCursor)
    const slashOffset = lineUntilCursor.indexOf('/')
    if (slashOffset === -1) {
      setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
      return
    }
    const prefix = lineUntilCursor.slice(0, slashOffset)
    if (prefix.trim() !== '') {
      setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
      return
    }
    const query = lineUntilCursor.slice(slashOffset + 1).trim().toLowerCase()
    setSlashState({
      isOpen: true,
      query,
      replaceStart: lineStart + slashOffset,
      replaceEnd: safeCursor,
    })
  }

  function updateNoteContent(noteId: string, content: string, cursor?: number): void {
    const note = notesById.get(noteId)
    if (!note) {
      return
    }
    setNotes((current) =>
      current.map((note) =>
        note.id === noteId ? { ...note, content, updatedAt: formatNow() } : note,
      ),
    )
    if (typeof cursor === 'number' && noteId === activeNoteId) {
      updateSlashState(content, cursor)
    }
    queueDesktopSave(note.path, content)
    setStatusLine(`Autosaved ${note.title}`)
  }

  function updateActiveContent(content: string, cursor?: number): void {
    if (!activeNote) {
      return
    }
    updateNoteContent(activeNote.id, content, cursor)
  }

  function titleFromPath(path: string): string {
    const stem = path.split('/').pop()?.replace(/\.md$/i, '') ?? path
    return stem
      .split(/[-_]/g)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() + part.slice(1))
      .join(' ')
  }

  function ensureNoteByPath(path: string, heading: string): VaultNote {
    const existing = notes.find((note) => normalizeLink(note.path) === normalizeLink(path))
    if (existing) {
      return existing
    }
    let seed = notes.length + 1
    let id = `note-generated-${seed}`
    while (notes.some((note) => note.id === id)) {
      seed += 1
      id = `note-generated-${seed}`
    }
    const newNote: VaultNote = {
      id,
      path,
      title: titleFromPath(path),
      content: `${heading}\n\n`,
      tags: ['#capture'],
      updatedAt: formatNow(),
    }
    setNotes((current) => [newNote, ...current])
    return newNote
  }

  function openTodayDailyNote(): void {
    if (isNativeDesktop && activeVaultRoot) {
      void invoke<DesktopNoteSnapshot>('desktop_open_daily_note', {
        vaultRoot: activeVaultRoot,
        dailyFolder: dailyNoteConfig.folder,
        dailyPattern: dailyNoteConfig.fileNamePattern,
        dailyHeading: dailyNoteConfig.headingTemplate,
      })
        .then((snapshot) => {
          const note = fromDesktopNote(snapshot)
          upsertNote(note, true)
          setStatusLine(`Opened daily note ${note.path}`)
        })
        .catch((error) => {
          setStatusLine(`Open daily note failed: ${String(error)}`)
        })
      return
    }

    const today = new Date()
    const path = dailyNotePathForDate(dailyNoteConfig, today)
    const note = ensureNoteByPath(path, dailyHeadingForDate(dailyNoteConfig, today))
    openNote(note.id, 'daily note')
    setStatusLine(`Opened daily note ${path}`)
  }

  function appendCaptureEntry(target: CaptureTarget, text: string): void {
    const trimmed = text.trim()
    if (!trimmed) {
      setStatusLine('Capture text is empty')
      return
    }

    if (isNativeDesktop && activeVaultRoot) {
      void invoke<DesktopCaptureResponse>('desktop_capture_append', {
        vaultRoot: activeVaultRoot,
        target,
        text: trimmed,
        notePath: activeNote?.path ?? null,
        dailyFolder: dailyNoteConfig.folder,
        dailyPattern: dailyNoteConfig.fileNamePattern,
        dailyHeading: dailyNoteConfig.headingTemplate,
      })
        .then((response) => {
          const note = fromDesktopNote(response.note)
          upsertNote(note, true)
          setCaptureOpen(false)
          setCaptureText('')
          setStatusLine(`Captured to ${note.path}`)
        })
        .catch((error) => {
          setStatusLine(`Capture failed: ${String(error)}`)
        })
      return
    }

    const timestamp = formatNow()
    const entry = `- [${timestamp}] ${trimmed}`
    let targetPath: string
    let heading: string
    if (target === 'inbox') {
      targetPath = '00 Inbox/Inbox.md'
      heading = '# Inbox'
    } else if (target === 'daily') {
      const now = new Date()
      targetPath = dailyNotePathForDate(dailyNoteConfig, now)
      heading = dailyHeadingForDate(dailyNoteConfig, now)
    } else if (activeNote) {
      targetPath = activeNote.path
      heading = `# ${activeNote.title}`
    } else {
      targetPath = '00 Inbox/Inbox.md'
      heading = '# Inbox'
    }

    const note = ensureNoteByPath(targetPath, heading)
    setNotes((current) =>
      current.map((item) => {
        if (item.id !== note.id) {
          return item
        }
        const prefix = item.content.endsWith('\n') ? '' : '\n'
        return {
          ...item,
          content: `${item.content}${prefix}${entry}\n`,
          updatedAt: formatNow(),
        }
      }),
    )
    openNote(note.id, `capture:${target}`)
    setCaptureOpen(false)
    setCaptureText('')
    setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
    setStatusLine(`Captured to ${targetPath}`)
  }

  function insertAtCursor(template: string, label: string): void {
    if (!activeNote) {
      return
    }
    const editor = editorRef.current
    const start = editor?.selectionStart ?? activeNote.content.length
    const end = editor?.selectionEnd ?? start
    const before = activeNote.content.slice(0, start)
    const after = activeNote.content.slice(end)
    const next = `${before}${template}${after}`
    updateActiveContent(next)
    setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
    setStatusLine(`Inserted ${label}`)

    requestAnimationFrame(() => {
      const field = editorRef.current
      if (!field) {
        return
      }
      const nextCursor = before.length + template.length
      field.focus()
      field.selectionStart = nextCursor
      field.selectionEnd = nextCursor
    })
  }

  function insertSlashCommand(command: SlashCommand): void {
    if (!activeNote) {
      return
    }
    const replacement = command.insert(new Date())
    const before = activeNote.content.slice(0, slashState.replaceStart)
    const after = activeNote.content.slice(slashState.replaceEnd)
    const next = `${before}${replacement}${after}`
    updateActiveContent(next)
    setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
    setStatusLine(`Inserted ${command.name}`)

    requestAnimationFrame(() => {
      const field = editorRef.current
      if (!field) {
        return
      }
      const nextCursor = before.length + replacement.length
      field.focus()
      field.selectionStart = nextCursor
      field.selectionEnd = nextCursor
    })
  }

  function togglePin(noteId: string): void {
    setPinnedTabs((current) => {
      if (current.includes(noteId)) {
        return current.filter((value) => value !== noteId)
      }
      return [...current, noteId]
    })
  }

  function executeCommandById(commandId: string): void {
    switch (commandId) {
      case 'command-palette:open':
        setCommandPaletteOpen(true)
        return
      case 'switcher:open':
        setQuickSwitcherOpen(true)
        return
      case 'vaults:open-modal':
        setVaultModalOpen(true)
        return
      case 'vaults:bootstrap-refresh':
        void bootstrapDesktopWorkspace()
        return
      case 'graph:open-view':
        setGraphOpen((value) => !value)
        return
      case 'settings:open':
        setSettingsOpen((value) => !value)
        return
      case 'app:go-back':
        navigateBack()
        return
      case 'app:go-forward':
        navigateForward()
        return
      case 'file-explorer:new-file':
        createNote()
        return
      case 'markdown:toggle-preview':
        setEditorMode((mode) => {
          if (mode === 'source') {
            return 'preview'
          }
          if (mode === 'preview') {
            return 'split'
          }
          return 'source'
        })
        return
      case 'workspace:split-vertical':
        splitActivePane()
        return
      case 'app:toggle-left-sidebar':
        setLeftSidebarVisible((value) => !value)
        return
      case 'app:toggle-right-sidebar':
        setRightSidebarVisible((value) => !value)
        return
      case 'theme:toggle-light-dark':
        setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
        return
      case 'daily-note:open-today':
        openTodayDailyNote()
        return
      case 'capture:append-inbox':
        setCaptureTarget('inbox')
        setCaptureOpen(true)
        return
      case 'capture:append-daily':
        setCaptureTarget('daily')
        setCaptureOpen(true)
        return
      case 'capture:append-active-note':
        setCaptureTarget('active')
        setCaptureOpen(true)
        return
      case 'insert:callout':
        insertAtCursor('> [!info] Context\n> \n', 'callout')
        return
      case 'insert:decision-block':
        insertAtCursor(
          '## Decision\nstatus:: proposed\nrationale:: \nalternatives:: \n',
          'decision block',
        )
        return
      case 'insert:task':
        insertAtCursor('- [ ] ', 'task')
        return
      default:
        setStatusLine(`Unknown command ${commandId}`)
    }
  }

  function executeCommand(command: WorkspaceCommand): void {
    executeCommandById(command.id)
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
    },
    {
      id: 'switcher:open',
      name: 'Open quick switcher',
      hotkey: commandHotkey('switcher:open', 'Mod+O'),
      description: 'Find and open a note by title',
    },
    {
      id: 'vaults:open-modal',
      name: 'Open vault manager',
      hotkey: commandHotkey('vaults:open-modal', 'Mod+Shift+V'),
      description: 'Open or switch local vaults in desktop runtime',
    },
    {
      id: 'vaults:bootstrap-refresh',
      name: 'Refresh desktop workspace',
      hotkey: commandHotkey('vaults:bootstrap-refresh', 'Mod+Shift+B'),
      description: 'Reload vault index and desktop registry state',
    },
    {
      id: 'graph:open-view',
      name: 'Open graph view',
      hotkey: commandHotkey('graph:open-view', 'Mod+G'),
      description: 'Open graph relationships for current vault notes',
    },
    {
      id: 'settings:open',
      name: 'Open settings',
      hotkey: commandHotkey('settings:open', 'Mod+,'),
      description: 'Open workspace settings panel',
    },
    {
      id: 'app:go-back',
      name: 'Go back',
      hotkey: commandHotkey('app:go-back', 'Mod+['),
      description: 'Open previous note from navigation history',
    },
    {
      id: 'app:go-forward',
      name: 'Go forward',
      hotkey: commandHotkey('app:go-forward', 'Mod+]'),
      description: 'Open next note from navigation history',
    },
    {
      id: 'file-explorer:new-file',
      name: 'Create new note',
      hotkey: commandHotkey('file-explorer:new-file', 'Mod+N'),
      description: 'Create a markdown note in inbox',
    },
    {
      id: 'markdown:toggle-preview',
      name: 'Toggle source/preview mode',
      hotkey: commandHotkey('markdown:toggle-preview', 'Mod+E'),
      description: 'Switch editor mode',
    },
    {
      id: 'workspace:split-vertical',
      name: 'Split active pane right',
      hotkey: commandHotkey('workspace:split-vertical', 'Mod+Backslash'),
      description: 'Create adjacent pane with its own tab stack',
    },
    {
      id: 'app:toggle-left-sidebar',
      name: 'Toggle left sidebar',
      hotkey: commandHotkey('app:toggle-left-sidebar', 'Mod+Alt+Left'),
      description: 'Show or hide file navigation',
    },
    {
      id: 'app:toggle-right-sidebar',
      name: 'Toggle right sidebar',
      hotkey: commandHotkey('app:toggle-right-sidebar', 'Mod+Alt+Right'),
      description: 'Show or hide backlinks and inspector',
    },
    {
      id: 'theme:toggle-light-dark',
      name: 'Toggle theme',
      hotkey: commandHotkey('theme:toggle-light-dark', 'Mod+Shift+L'),
      description: 'Switch dark and light UI modes',
    },
    {
      id: 'daily-note:open-today',
      name: 'Open today daily note',
      hotkey: commandHotkey('daily-note:open-today', 'Mod+Shift+D'),
      description: 'Open or create today daily note using configured folder and format',
    },
    {
      id: 'capture:append-inbox',
      name: 'Capture to inbox',
      hotkey: commandHotkey('capture:append-inbox', 'Mod+Shift+I'),
      description: 'Open quick capture targeting inbox',
    },
    {
      id: 'capture:append-daily',
      name: 'Capture to daily note',
      hotkey: commandHotkey('capture:append-daily', 'Mod+Shift+J'),
      description: 'Open quick capture targeting today daily note',
    },
    {
      id: 'capture:append-active-note',
      name: 'Capture to active note',
      hotkey: commandHotkey('capture:append-active-note', 'Mod+Shift+K'),
      description: 'Open quick capture targeting currently active note',
    },
    {
      id: 'insert:callout',
      name: 'Insert callout',
      hotkey: commandHotkey('insert:callout', 'Mod+Shift+C'),
      description: 'Insert an info callout template at cursor',
    },
    {
      id: 'insert:decision-block',
      name: 'Insert decision block',
      hotkey: commandHotkey('insert:decision-block', 'Mod+Shift+R'),
      description: 'Insert structured decision metadata fields',
    },
    {
      id: 'insert:task',
      name: 'Insert task',
      hotkey: commandHotkey('insert:task', 'Mod+Shift+T'),
      description: 'Insert checklist item at cursor',
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
    saveDailyNoteConfig(dailyNoteConfig)
  }, [dailyNoteConfig])

  useEffect(() => {
    void bootstrapDesktopWorkspace()
    const cleanupTimers = pendingSaves.current
    return () => {
      for (const key of Object.keys(cleanupTimers)) {
        window.clearTimeout(cleanupTimers[key])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!paneResizeActive || editorPanes.length < 2) {
      return
    }

    function onMouseMove(event: MouseEvent): void {
      const container = paneDockRef.current
      if (!container) {
        return
      }
      const bounds = container.getBoundingClientRect()
      if (bounds.width <= 0) {
        return
      }
      const ratio = (event.clientX - bounds.left) / bounds.width
      const boundedRatio = Math.min(0.75, Math.max(0.25, ratio))
      setPaneSplitRatio(boundedRatio)
    }

    function stopResize(): void {
      setPaneResizeActive(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopResize)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopResize)
    }
  }, [paneResizeActive, editorPanes.length])

  useEffect(() => {
    const keyboundCommands = commands
      .filter((command) => command.hotkey.trim() !== '')
      .map((command) => ({ id: command.id, hotkey: command.hotkey }))

    function onKeyDown(event: KeyboardEvent): void {
      if (!event.metaKey && !event.ctrlKey) {
        return
      }
      if (isEditableTarget(event.target)) {
        const safeInEditor = [
          'file-explorer:new-file',
          'command-palette:open',
          'switcher:open',
          'vaults:open-modal',
          'vaults:bootstrap-refresh',
          'graph:open-view',
          'settings:open',
          'capture:append-inbox',
          'capture:append-daily',
          'capture:append-active-note',
          'daily-note:open-today',
          'insert:callout',
          'insert:decision-block',
          'insert:task',
        ]
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

  function renderEditorPane(pane: EditorPane): React.ReactNode {
    const isFocused = pane.id === activePaneId
    const paneActiveNote =
      notesById.get(pane.activeNoteId) ?? notesById.get(pane.tabIds[0] ?? '') ?? null

    return (
      <section
        key={pane.id}
        className={isFocused ? 'editor-pane is-focused' : 'editor-pane'}
        onMouseDown={() => focusPane(pane.id)}
      >
        <div className="tabbar">
          {pane.tabIds.map((tabId) => {
            const note = notesById.get(tabId)
            if (!note) {
              return null
            }
            const pinned = pinnedTabs.includes(tabId)
            const isTabActive = paneActiveNote ? paneActiveNote.id === tabId : false
            return (
              <div key={tabId} className={isTabActive ? 'tab is-active' : 'tab'}>
                <button type="button" onClick={() => openNote(tabId, note.title, true, pane.id)}>
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
                <button
                  type="button"
                  className="tab-close"
                  onClick={() => closeTab(tabId, pane.id)}
                >
                  ×
                </button>
              </div>
            )
          })}
          <div className="pane-tab-actions">
            {editorPanes.length === 1 && (
              <button type="button" onClick={() => splitActivePane()}>
                Split
              </button>
            )}
            {editorPanes.length > 1 && (
              <>
                <button type="button" onClick={() => moveActiveTabToOtherPane(pane.id)}>
                  Move
                </button>
                <button type="button" onClick={() => closePane(pane.id)}>
                  Close Pane
                </button>
              </>
            )}
          </div>
        </div>

        {paneActiveNote ? (
          <div className={editorMode === 'split' ? 'editor-panels split' : 'editor-panels'}>
            {(editorMode === 'source' || editorMode === 'split') && (
              <textarea
                ref={isFocused ? editorRef : null}
                className="source-editor"
                value={paneActiveNote.content}
                onFocus={() => focusPane(pane.id)}
                onChange={(event) =>
                  updateNoteContent(
                    paneActiveNote.id,
                    event.target.value,
                    isFocused ? event.currentTarget.selectionStart : undefined,
                  )
                }
                onClick={(event) => {
                  if (isFocused) {
                    updateSlashState(event.currentTarget.value, event.currentTarget.selectionStart)
                  }
                }}
                onKeyUp={(event) => {
                  if (isFocused) {
                    updateSlashState(event.currentTarget.value, event.currentTarget.selectionStart)
                  }
                }}
                onKeyDown={(event) => {
                  if (!isFocused || !slashState.isOpen) {
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setSlashState({ isOpen: false, query: '', replaceStart: 0, replaceEnd: 0 })
                  } else if (event.key === 'Enter' && filteredSlashCommands.length > 0) {
                    event.preventDefault()
                    insertSlashCommand(filteredSlashCommands[0])
                  }
                }}
                spellCheck={false}
              />
            )}
            {(editorMode === 'preview' || editorMode === 'split') && (
              <article className="preview-pane" onMouseDown={() => focusPane(pane.id)}>
                {renderMarkdown(paneActiveNote.content)}
              </article>
            )}
            {isFocused && slashState.isOpen && editorMode !== 'preview' && (
              <section className="slash-panel">
                <header>
                  <strong>Slash Commands</strong>
                  <small>Press Enter to apply first match</small>
                </header>
                <div className="slash-list">
                  {filteredSlashCommands.map((command) => (
                    <button
                      key={command.id}
                      type="button"
                      className="slash-item"
                      onClick={() => insertSlashCommand(command)}
                    >
                      <span>{command.name}</span>
                      <small>{command.description}</small>
                    </button>
                  ))}
                  {filteredSlashCommands.length === 0 && (
                    <p className="muted">No slash command matches.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="empty-state">No note selected</div>
        )}
      </section>
    )
  }

  function ribbonActionIsActive(actionId: string): boolean {
    if (actionId === 'app:toggle-left-sidebar') {
      return leftSidebarVisible
    }
    if (actionId === 'app:toggle-right-sidebar') {
      return rightSidebarVisible
    }
    if (actionId === 'graph:open-view') {
      return graphOpen
    }
    if (actionId === 'settings:open') {
      return settingsOpen
    }
    if (actionId === 'theme:toggle-light-dark') {
      return theme === 'light'
    }
    return false
  }

  return (
    <main className="tf-shell">
      <header className="topbar">
        <div className="topbar-left">
          <strong className="brand">Thoughtforge</strong>
          <span className="vault-name">Vault: {activeVaultName}</span>
          <span className="meta-pill">
            {isNativeDesktop
              ? isMacDesktop
                ? 'macOS desktop runtime'
                : 'desktop runtime'
              : 'web shell mode'}
          </span>
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
          <button type="button" onClick={() => setGraphOpen(true)}>
            Graph
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
          <button type="button" onClick={() => setVaultModalOpen(true)}>
            Vaults
          </button>
          <button
            type="button"
            onClick={() => {
              setCaptureTarget('inbox')
              setCaptureOpen(true)
            }}
          >
            Capture
          </button>
          <button type="button" onClick={() => openTodayDailyNote()}>
            Daily
          </button>
          <button type="button" onClick={() => createNote()}>
            New Note
          </button>
        </div>
      </header>

      <section className="workspace-shell">
        <aside className="activity-ribbon" aria-label="Activity ribbon">
          <div className="ribbon-group">
            {RIBBON_PRIMARY_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className={ribbonActionIsActive(action.id) ? 'ribbon-button is-active' : 'ribbon-button'}
                title={`${action.label} (${action.description})`}
                aria-label={action.label}
                onClick={() => executeCommandById(action.id)}
              >
                {action.glyph}
              </button>
            ))}
          </div>
          <div className="ribbon-group ribbon-group-bottom">
            {RIBBON_SECONDARY_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                className={ribbonActionIsActive(action.id) ? 'ribbon-button is-active' : 'ribbon-button'}
                title={`${action.label} (${action.description})`}
                aria-label={action.label}
                onClick={() => executeCommandById(action.id)}
              >
                {action.glyph}
              </button>
            ))}
          </div>
        </aside>

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
          <div
            ref={paneDockRef}
            className={editorPanes.length > 1 ? 'pane-dock is-split' : 'pane-dock'}
          >
            {editorPanes.length === 0 && <div className="empty-state">No note selected</div>}
            {editorPanes.length === 1 && renderEditorPane(editorPanes[0])}
            {editorPanes.length > 1 && (
              <>
                <div className="pane-slot" style={{ flexBasis: `${paneSplitRatio * 100}%` }}>
                  {renderEditorPane(editorPanes[0])}
                </div>
                <div
                  className="pane-resizer"
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize panes"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    setPaneResizeActive(true)
                  }}
                />
                <div className="pane-slot" style={{ flexBasis: `${(1 - paneSplitRatio) * 100}%` }}>
                  {renderEditorPane(editorPanes[1])}
                </div>
              </>
            )}
          </div>
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
                  <p>
                    <strong>Frontmatter:</strong> {activeFrontmatter.length}
                  </p>
                  <p>
                    <strong>Inline Metadata:</strong> {activeInlineMetadata.length}
                  </p>
                </section>

                <section className="inspector-card">
                  <h3>Metadata</h3>
                  <p>
                    <strong>Frontmatter Fields</strong>
                  </p>
                  <ul>
                    {activeFrontmatter.length === 0 && <li className="muted">No frontmatter fields</li>}
                    {activeFrontmatter.map((field) => (
                      <li key={`fm-${field.key}-${field.value}`}>
                        <code>
                          {field.key}: {field.value}
                        </code>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Inline Fields</strong>
                  </p>
                  <ul>
                    {activeInlineMetadata.length === 0 && <li className="muted">No inline fields</li>}
                    {activeInlineMetadata.map((field) => (
                      <li key={`im-${field.key}-${field.value}`}>
                        <code>
                          {field.key}:: {field.value}
                        </code>
                      </li>
                    ))}
                  </ul>
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
                  <h3>Blocks and Embeds</h3>
                  <p>
                    <strong>Anchors</strong>
                  </p>
                  <ul>
                    {activeBlockAnchors.length === 0 && <li className="muted">No anchors</li>}
                    {activeBlockAnchors.map((anchor) => (
                      <li key={anchor}>
                        <code>^{anchor}</code>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Block References</strong>
                  </p>
                  <ul>
                    {activeBlockReferences.length === 0 && <li className="muted">No block references</li>}
                    {activeBlockReferences.map((reference) => (
                      <li key={`block-ref-${reference.raw}`}>
                        <code>
                          {reference.target}
                          #^{reference.blockId}
                        </code>
                      </li>
                    ))}
                  </ul>
                  <p>
                    <strong>Embeds</strong>
                  </p>
                  <ul>
                    {activeEmbeds.length === 0 && <li className="muted">No embeds</li>}
                    {activeEmbeds.map((reference) => (
                      <li key={`embed-${reference.raw}`}>
                        <code>{reference.raw}</code>
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
                    {commands.slice(0, 12).map((command) => (
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

                <section className="inspector-card">
                  <h3>Capture Settings</h3>
                  <label className="binding-row">
                    <span>Daily Folder</span>
                    <input
                      type="text"
                      value={dailyNoteConfig.folder}
                      onChange={(event) =>
                        setDailyNoteConfig((current) => ({
                          ...current,
                          folder: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="binding-row">
                    <span>Daily File Pattern</span>
                    <input
                      type="text"
                      value={dailyNoteConfig.fileNamePattern}
                      onChange={(event) =>
                        setDailyNoteConfig((current) => ({
                          ...current,
                          fileNamePattern: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="binding-row">
                    <span>Daily Heading Template</span>
                    <input
                      type="text"
                      value={dailyNoteConfig.headingTemplate}
                      onChange={(event) =>
                        setDailyNoteConfig((current) => ({
                          ...current,
                          headingTemplate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <button type="button" onClick={() => openTodayDailyNote()}>
                    Open Daily Note
                  </button>
                </section>
              </>
            ) : (
              <p className="muted">Select a note to inspect.</p>
            )}
          </aside>
        )}
      </section>
      </section>

      <footer className="statusbar">
        <span>{statusLine}</span>
        <span>
          {notes.length} notes indexed
          {activeVaultRoot ? ` • ${activeVaultRoot}` : ''}
        </span>
        <span>
          Mode: {editorMode} • {isNativeDesktop ? 'desktop' : 'web'}
        </span>
      </footer>

      {graphOpen && (
        <div className="overlay" onClick={() => setGraphOpen(false)} role="presentation">
          <section
            className="modal graph-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Graph View</h2>
              <button type="button" onClick={() => setGraphOpen(false)}>
                Close
              </button>
            </header>
            <div className="graph-summary">
              <span>{notes.length} nodes</span>
              <span>{graphEdges.length} links</span>
              {activeNote && <span>Focused: {activeNote.title}</span>}
            </div>
            <div className="graph-grid">
              <section className="inspector-card">
                <h3>Focused Neighborhood</h3>
                {activeNote && activeGraphNeighbors.length === 0 && (
                  <p className="muted">No linked notes for current focus.</p>
                )}
                {!activeNote && <p className="muted">No active note selected.</p>}
                <ul>
                  {activeGraphNeighbors.map((note) => (
                    <li key={`graph-neighbor-${note.id}`}>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => {
                          openNote(note.id, `graph:${note.title}`)
                          setGraphOpen(false)
                        }}
                      >
                        {note.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="inspector-card">
                <h3>Node Degrees</h3>
                <div className="graph-node-list">
                  {[...notes]
                    .sort((a, b) => {
                      const left = graphMetricsByNote[a.id]
                      const right = graphMetricsByNote[b.id]
                      const leftScore = (left?.incoming ?? 0) + (left?.outgoing ?? 0)
                      const rightScore = (right?.incoming ?? 0) + (right?.outgoing ?? 0)
                      return rightScore - leftScore
                    })
                    .map((note) => {
                      const score = graphMetricsByNote[note.id] ?? { incoming: 0, outgoing: 0 }
                      return (
                        <button
                          key={`graph-node-${note.id}`}
                          type="button"
                          className="graph-node-row"
                          onClick={() => openNote(note.id, `graph:${note.title}`)}
                        >
                          <span>{note.title}</span>
                          <span className="graph-pill">
                            in {score.incoming} • out {score.outgoing}
                          </span>
                        </button>
                      )
                    })}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="overlay" onClick={() => setSettingsOpen(false)} role="presentation">
          <section
            className="modal settings-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Workspace Settings</h2>
              <button type="button" onClick={() => setSettingsOpen(false)}>
                Close
              </button>
            </header>
            <div className="settings-grid">
              <section className="inspector-card">
                <h3>Interface</h3>
                <div className="capture-actions">
                  <button type="button" onClick={() => setTheme('dark')}>
                    Dark
                  </button>
                  <button type="button" onClick={() => setTheme('light')}>
                    Light
                  </button>
                </div>
                <div className="capture-actions">
                  <button type="button" onClick={() => setLeftSidebarVisible((value) => !value)}>
                    Toggle Left Sidebar
                  </button>
                  <button type="button" onClick={() => setRightSidebarVisible((value) => !value)}>
                    Toggle Right Sidebar
                  </button>
                </div>
                <div className="capture-actions">
                  <button type="button" onClick={() => setEditorMode('source')}>
                    Source
                  </button>
                  <button type="button" onClick={() => setEditorMode('preview')}>
                    Preview
                  </button>
                  <button type="button" onClick={() => setEditorMode('split')}>
                    Split
                  </button>
                </div>
              </section>

              <section className="inspector-card">
                <h3>Daily Note Defaults</h3>
                <label className="binding-row">
                  <span>Folder</span>
                  <input
                    type="text"
                    value={dailyNoteConfig.folder}
                    onChange={(event) =>
                      setDailyNoteConfig((current) => ({
                        ...current,
                        folder: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="binding-row">
                  <span>File Pattern</span>
                  <input
                    type="text"
                    value={dailyNoteConfig.fileNamePattern}
                    onChange={(event) =>
                      setDailyNoteConfig((current) => ({
                        ...current,
                        fileNamePattern: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="binding-row">
                  <span>Heading Template</span>
                  <input
                    type="text"
                    value={dailyNoteConfig.headingTemplate}
                    onChange={(event) =>
                      setDailyNoteConfig((current) => ({
                        ...current,
                        headingTemplate: event.target.value,
                      }))
                    }
                  />
                </label>
              </section>

              <section className="inspector-card">
                <h3>Hotkeys</h3>
                <div className="binding-grid">
                  {commands.slice(0, 15).map((command) => (
                    <label key={`settings-binding-${command.id}`} className="binding-row">
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

              <section className="inspector-card">
                <h3>Vault Runtime</h3>
                <p>
                  <strong>Mode:</strong>{' '}
                  {isNativeDesktop ? (isMacDesktop ? 'macOS desktop runtime' : 'desktop runtime') : 'web'}
                </p>
                <p>
                  <strong>Vault:</strong> {activeVaultName}
                </p>
                {activeVaultRoot && (
                  <p>
                    <strong>Root:</strong> {activeVaultRoot}
                  </p>
                )}
                <div className="capture-actions">
                  <button type="button" onClick={() => setVaultModalOpen(true)}>
                    Manage Vaults
                  </button>
                  <button type="button" onClick={() => setCommandPaletteOpen(true)}>
                    Open Commands
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

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

      {vaultModalOpen && (
        <div className="overlay" onClick={() => setVaultModalOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Vaults</h2>
              <button type="button" onClick={() => setVaultModalOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <label className="binding-row">
                <span>Open Vault Path</span>
                <input
                  type="text"
                  value={vaultPathInput}
                  onChange={(event) => setVaultPathInput(event.target.value)}
                  placeholder="/Users/you/Documents/MyVault"
                />
              </label>
              <label className="binding-row">
                <span>Optional Display Name</span>
                <input
                  type="text"
                  value={vaultNameInput}
                  onChange={(event) => setVaultNameInput(event.target.value)}
                  placeholder="Personal Vault"
                />
              </label>
              <div className="capture-actions">
                <button
                  type="button"
                  disabled={vaultActionBusy}
                  onClick={() => {
                    void openVaultByPath(vaultPathInput, vaultNameInput)
                  }}
                >
                  Open Path
                </button>
              </div>

              <section className="inspector-card">
                <h3>Registered Vaults</h3>
                {knownVaults.length === 0 && <p className="muted">No registered vaults yet.</p>}
                {knownVaults.length > 0 && (
                  <ul>
                    {knownVaults.map((vault) => (
                      <li key={vault.id}>
                        <button
                          type="button"
                          className="inline-link"
                          disabled={vaultActionBusy}
                          onClick={() => {
                            if (vault.isActive) {
                              setVaultModalOpen(false)
                              return
                            }
                            void switchVault(vault.id)
                          }}
                        >
                          {vault.name}
                        </button>{' '}
                        <small>{vault.rootPath}</small>
                        {vault.isActive && <em> (active)</em>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {registryPath && (
                <p className="muted">
                  Registry:
                  {' '}
                  <code>{registryPath}</code>
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {captureOpen && (
        <div className="overlay" onClick={() => setCaptureOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Quick Capture</h2>
              <button type="button" onClick={() => setCaptureOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <label className="binding-row">
                <span>Target</span>
                <select
                  value={captureTarget}
                  onChange={(event) => setCaptureTarget(event.target.value as CaptureTarget)}
                >
                  <option value="inbox">Inbox</option>
                  <option value="daily">Daily Note</option>
                  <option value="active">Active Note</option>
                </select>
              </label>
              <label className="binding-row">
                <span>Capture</span>
                <textarea
                  className="capture-input"
                  value={captureText}
                  onChange={(event) => setCaptureText(event.target.value)}
                  placeholder="Capture thought, intent, blocker, or decision..."
                  autoFocus
                />
              </label>
              <div className="capture-actions">
                <button type="button" onClick={() => appendCaptureEntry(captureTarget, captureText)}>
                  Append
                </button>
                <button type="button" onClick={() => setCaptureOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
