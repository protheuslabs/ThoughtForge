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

type TabDropTarget = {
  paneId: string
  index: number
}

type WorkspacePreset = {
  id: string
  name: string
  layout: PersistedWorkspaceLayout
  panes: EditorPane[]
  updatedAt: string
}

type LocalHistorySnapshot = {
  id: string
  noteId: string
  timestamp: number
  content: string
}

type BookmarkItem = {
  id: string
  type: 'note' | 'search'
  label: string
  noteId?: string
  query?: string
}

type NoteTemplate = {
  id: string
  name: string
  content: string
}

type RibbonConfig = {
  primaryActionIds: string[]
  secondaryActionIds: string[]
}

type SearchResult = {
  noteId: string
  title: string
  path: string
  snippet: string
}

type CanvasCard = {
  noteId: string
  x: number
  y: number
}

type BasesViewMode = 'table' | 'list' | 'cards'

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
const WORKSPACE_PRESETS_KEY = 'thoughtforge.workspace.presets.v1'
const LOCAL_HISTORY_KEY = 'thoughtforge.local.history.v1'
const BOOKMARKS_KEY = 'thoughtforge.bookmarks.v1'
const TEMPLATES_KEY = 'thoughtforge.templates.v1'
const RIBBON_CONFIG_KEY = 'thoughtforge.ribbon.config.v1'
const STACKED_TABS_KEY = 'thoughtforge.stacked.tabs.v1'
const CANVAS_LAYOUT_KEY = 'thoughtforge.canvas.layout.v1'
const MAIN_EDITOR_PANE_ID = 'pane-main'

const DEFAULT_DAILY_NOTE_CONFIG: DailyNoteConfig = {
  folder: '00 Daily',
  fileNamePattern: '%Y-%m-%d',
  headingTemplate: '# Daily Note - {date}',
}

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'template-decision',
    name: 'Decision Record',
    content:
      '## Decision\nstatus:: proposed\nowner:: \ncontext:: \nrationale:: \nalternatives:: \n',
  },
  {
    id: 'template-standup',
    name: 'Standup Update',
    content: '## Standup\nYesterday:: \nToday:: \nBlockers:: \n',
  },
  {
    id: 'template-evidence',
    name: 'Evidence Capture',
    content: 'source:: \ncaptured_at:: {{time}}\n\n> ',
  },
]

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

const DEFAULT_RIBBON_CONFIG: RibbonConfig = {
  primaryActionIds: RIBBON_PRIMARY_ACTIONS.map((action) => action.id),
  secondaryActionIds: RIBBON_SECONDARY_ACTIONS.map((action) => action.id),
}

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

function loadWorkspacePresets(): WorkspacePreset[] {
  try {
    const raw = window.localStorage.getItem(WORKSPACE_PRESETS_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as WorkspacePreset[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveWorkspacePresets(presets: WorkspacePreset[]): void {
  try {
    window.localStorage.setItem(WORKSPACE_PRESETS_KEY, JSON.stringify(presets))
  } catch {
    // no-op
  }
}

function loadLocalHistorySnapshots(): LocalHistorySnapshot[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as LocalHistorySnapshot[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalHistorySnapshots(snapshots: LocalHistorySnapshot[]): void {
  try {
    window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(snapshots))
  } catch {
    // no-op
  }
}

function loadBookmarks(): BookmarkItem[] {
  try {
    const raw = window.localStorage.getItem(BOOKMARKS_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as BookmarkItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveBookmarks(bookmarks: BookmarkItem[]): void {
  try {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks))
  } catch {
    // no-op
  }
}

function loadTemplates(): NoteTemplate[] {
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY)
    if (!raw) {
      return DEFAULT_TEMPLATES
    }
    const parsed = JSON.parse(raw) as NoteTemplate[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEMPLATES
  } catch {
    return DEFAULT_TEMPLATES
  }
}

function saveTemplates(templates: NoteTemplate[]): void {
  try {
    window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  } catch {
    // no-op
  }
}

function loadRibbonConfig(): RibbonConfig {
  try {
    const raw = window.localStorage.getItem(RIBBON_CONFIG_KEY)
    if (!raw) {
      return DEFAULT_RIBBON_CONFIG
    }
    const parsed = JSON.parse(raw) as Partial<RibbonConfig>
    return {
      primaryActionIds:
        parsed.primaryActionIds?.filter((id) =>
          RIBBON_PRIMARY_ACTIONS.some((action) => action.id === id),
        ) ?? DEFAULT_RIBBON_CONFIG.primaryActionIds,
      secondaryActionIds:
        parsed.secondaryActionIds?.filter((id) =>
          RIBBON_SECONDARY_ACTIONS.some((action) => action.id === id),
        ) ?? DEFAULT_RIBBON_CONFIG.secondaryActionIds,
    }
  } catch {
    return DEFAULT_RIBBON_CONFIG
  }
}

function saveRibbonConfig(config: RibbonConfig): void {
  try {
    window.localStorage.setItem(RIBBON_CONFIG_KEY, JSON.stringify(config))
  } catch {
    // no-op
  }
}

function loadStackedTabs(): boolean {
  try {
    return window.localStorage.getItem(STACKED_TABS_KEY) === '1'
  } catch {
    return false
  }
}

function saveStackedTabs(enabled: boolean): void {
  try {
    window.localStorage.setItem(STACKED_TABS_KEY, enabled ? '1' : '0')
  } catch {
    // no-op
  }
}

function loadCanvasCards(): CanvasCard[] {
  try {
    const raw = window.localStorage.getItem(CANVAS_LAYOUT_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as CanvasCard[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCanvasCards(cards: CanvasCard[]): void {
  try {
    window.localStorage.setItem(CANVAS_LAYOUT_KEY, JSON.stringify(cards))
  } catch {
    // no-op
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function firstMatchingSnippet(content: string, term: string): string {
  const lines = content.split('\n')
  const normalized = term.trim().toLowerCase()
  if (normalized) {
    const matched = lines.find((line) => line.toLowerCase().includes(normalized))
    if (matched) {
      return matched.trim()
    }
  }
  const fallback = lines.find((line) => line.trim() !== '')
  return fallback?.trim() ?? ''
}

function evaluateSearchDsl(note: VaultNote, query: string): { matches: boolean; snippet: string } {
  const rawTokens = query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
  if (rawTokens.length === 0) {
    return { matches: true, snippet: firstMatchingSnippet(note.content, '') }
  }
  const metadataFields = [
    ...extractFrontmatterFields(note.content).map((field) => field.key.toLowerCase()),
    ...extractInlineMetadataFields(note.content).map((field) => field.key.toLowerCase()),
  ]
  let snippet = ''

  for (const rawToken of rawTokens) {
    const negated = rawToken.startsWith('-')
    const token = negated ? rawToken.slice(1) : rawToken
    const lower = token.toLowerCase()
    let matched = false

    if (lower.startsWith('tag:')) {
      const value = lower.slice(4)
      matched = note.tags.some((tag) => tag.toLowerCase().includes(value.replace(/^#/, '')))
    } else if (lower.startsWith('path:')) {
      const value = lower.slice(5)
      matched = note.path.toLowerCase().includes(value)
    } else if (lower.startsWith('title:')) {
      const value = lower.slice(6)
      matched = note.title.toLowerCase().includes(value)
    } else if (lower.startsWith('task:')) {
      const value = lower.slice(5)
      if (value === 'done') {
        matched = /- \[[xX]\]/.test(note.content)
      } else if (value === 'todo') {
        matched = /- \[ \]/.test(note.content)
      } else {
        matched = /- \[[xX ]\]/.test(note.content)
      }
    } else if (lower.startsWith('property:')) {
      const value = lower.slice(9)
      matched = metadataFields.some((field) => field.includes(value))
    } else if (lower.startsWith('text:')) {
      const value = lower.slice(5)
      matched = note.content.toLowerCase().includes(value)
      if (matched) {
        snippet = firstMatchingSnippet(note.content, value)
      }
    } else {
      matched =
        note.title.toLowerCase().includes(lower) ||
        note.path.toLowerCase().includes(lower) ||
        note.content.toLowerCase().includes(lower)
      if (matched) {
        snippet = firstMatchingSnippet(note.content, lower)
      }
    }

    if (negated ? matched : !matched) {
      return { matches: false, snippet: '' }
    }
  }

  return { matches: true, snippet: snippet || firstMatchingSnippet(note.content, '') }
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
  const [draggingTab, setDraggingTab] = useState<{ noteId: string; fromPaneId: string } | null>(
    null,
  )
  const [tabDropTarget, setTabDropTarget] = useState<TabDropTarget | null>(null)
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
  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false)
  const [searchDslQuery, setSearchDslQuery] = useState<string>('')
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState<boolean>(false)
  const [workspacePresetName, setWorkspacePresetName] = useState<string>('')
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false)
  const [historyNoteId, setHistoryNoteId] = useState<string>('')
  const [bookmarksOpen, setBookmarksOpen] = useState<boolean>(false)
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => loadBookmarks())
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(false)
  const [templates, setTemplates] = useState<NoteTemplate[]>(() => loadTemplates())
  const [noteComposerOpen, setNoteComposerOpen] = useState<boolean>(false)
  const [composerTargetId, setComposerTargetId] = useState<string>('')
  const [composerNewTitle, setComposerNewTitle] = useState<string>('')
  const [ribbonConfigOpen, setRibbonConfigOpen] = useState<boolean>(false)
  const [ribbonConfig, setRibbonConfig] = useState<RibbonConfig>(() => loadRibbonConfig())
  const [workspacePresets, setWorkspacePresets] = useState<WorkspacePreset[]>(() =>
    loadWorkspacePresets(),
  )
  const [localHistorySnapshots, setLocalHistorySnapshots] = useState<LocalHistorySnapshot[]>(() =>
    loadLocalHistorySnapshots(),
  )
  const [closedTabsStack, setClosedTabsStack] = useState<
    { noteId: string; paneId: string; closedAt: number }[]
  >([])
  const [stackedTabs, setStackedTabs] = useState<boolean>(() => loadStackedTabs())
  const [hoverPreview, setHoverPreview] = useState<{ noteId: string; x: number; y: number } | null>(
    null,
  )
  const [basesOpen, setBasesOpen] = useState<boolean>(false)
  const [basesQuery, setBasesQuery] = useState<string>('')
  const [basesViewMode, setBasesViewMode] = useState<BasesViewMode>('table')
  const [basesSortKey, setBasesSortKey] = useState<'title' | 'path' | 'updated'>('updated')
  const [canvasOpen, setCanvasOpen] = useState<boolean>(false)
  const [canvasCards, setCanvasCards] = useState<CanvasCard[]>(() => loadCanvasCards())
  const [canvasDragging, setCanvasDragging] = useState<{
    noteId: string
    pointerOffsetX: number
    pointerOffsetY: number
  } | null>(null)
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
  const canvasRef = useRef<HTMLDivElement | null>(null)
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
  const hoverPreviewNote = hoverPreview ? (notesById.get(hoverPreview.noteId) ?? null) : null

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
  const unlinkedMentions = activeNote
    ? notes
        .filter((note) => note.id !== activeNote.id)
        .filter((note) => {
          const normalizedTitle = note.title.trim().toLowerCase()
          if (!normalizedTitle || activeLinks.some((link) => link === normalizeLink(note.title))) {
            return false
          }
          const linkPattern = new RegExp(`\\[\\[${escapeRegExp(note.title)}(?:[\\]|#])`, 'i')
          if (linkPattern.test(activeNote.content)) {
            return false
          }
          const mentionPattern = new RegExp(`\\b${escapeRegExp(note.title)}\\b`, 'i')
          return mentionPattern.test(activeNote.content)
        })
    : []

  const ribbonPrimaryActions = ribbonConfig.primaryActionIds
    .map((id) => RIBBON_PRIMARY_ACTIONS.find((action) => action.id === id))
    .filter((action): action is RibbonAction => Boolean(action))
  const ribbonSecondaryActions = ribbonConfig.secondaryActionIds
    .map((id) => RIBBON_SECONDARY_ACTIONS.find((action) => action.id === id))
    .filter((action): action is RibbonAction => Boolean(action))

  const searchResults: SearchResult[] = notes
    .map((note) => {
      const result = evaluateSearchDsl(note, searchDslQuery)
      return result.matches
        ? {
            noteId: note.id,
            title: note.title,
            path: note.path,
            snippet: result.snippet,
          }
        : null
    })
    .filter((result): result is SearchResult => result !== null)

  const selectedHistoryNoteId = historyNoteId || activeNote?.id || ''
  const historySnapshotsForSelectedNote = localHistorySnapshots
    .filter((snapshot) => snapshot.noteId === selectedHistoryNoteId)
    .sort((left, right) => right.timestamp - left.timestamp)

  const basesRows = notes.map((note) => {
    const words = note.content.split(/\s+/).filter(Boolean).length
    const links = extractLinks(note.content).length
    const frontmatterFields = extractFrontmatterFields(note.content).length
    const inlineFields = extractInlineMetadataFields(note.content).length
    return {
      noteId: note.id,
      title: note.title,
      path: note.path,
      updatedAt: note.updatedAt,
      tags: note.tags.join(' '),
      words,
      links,
      fields: frontmatterFields + inlineFields,
    }
  })
  const filteredBasesRows = basesRows
    .filter((row) => {
      const query = basesQuery.trim().toLowerCase()
      if (!query) {
        return true
      }
      return (
        row.title.toLowerCase().includes(query) ||
        row.path.toLowerCase().includes(query) ||
        row.tags.toLowerCase().includes(query)
      )
    })
    .sort((left, right) => {
      if (basesSortKey === 'title') {
        return left.title.localeCompare(right.title)
      }
      if (basesSortKey === 'path') {
        return left.path.localeCompare(right.path)
      }
      return right.updatedAt.localeCompare(left.updatedAt)
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

  function renderInlineWithLinks(line: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = []
    const pattern = /\[\[([^[\]]+)\]\]/g
    let cursor = 0
    let match = pattern.exec(line)
    while (match) {
      const start = match.index ?? 0
      if (start > cursor) {
        nodes.push(line.slice(cursor, start))
      }
      const raw = match[1] ?? ''
      const target = parseReferenceTarget(raw).target
      const targetId = aliasToNoteId[target]
      if (targetId) {
        nodes.push(
          <button
            key={`link-${targetId}-${start}`}
            type="button"
            className="inline-link preview-link"
            onClick={() => openNote(targetId, `wikilink:${raw}`)}
            onMouseEnter={(event) =>
              setHoverPreview({ noteId: targetId, x: event.clientX + 12, y: event.clientY + 12 })
            }
            onMouseLeave={() => setHoverPreview(null)}
          >
            [[{raw}]]
          </button>,
        )
      } else {
        nodes.push(`[[${raw}]]`)
      }
      cursor = start + match[0].length
      match = pattern.exec(line)
    }
    if (cursor < line.length) {
      nodes.push(line.slice(cursor))
    }
    return nodes
  }

  function renderMarkdownInteractive(markdown: string): React.ReactNode[] {
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
            {renderInlineWithLinks(line.slice(4))}
          </h3>,
        )
        continue
      }
      if (line.startsWith('## ')) {
        nodes.push(
          <h2 className="md-h2" key={`h2-${index}`}>
            {renderInlineWithLinks(line.slice(3))}
          </h2>,
        )
        continue
      }
      if (line.startsWith('# ')) {
        nodes.push(
          <h1 className="md-h1" key={`h1-${index}`}>
            {renderInlineWithLinks(line.slice(2))}
          </h1>,
        )
        continue
      }
      if (line.startsWith('- [ ] ')) {
        nodes.push(
          <div className="md-check" key={`todo-${index}`}>
            <input type="checkbox" readOnly checked={false} />
            <span>{renderInlineWithLinks(line.slice(6))}</span>
          </div>,
        )
        continue
      }
      if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        nodes.push(
          <div className="md-check" key={`done-${index}`}>
            <input type="checkbox" readOnly checked />
            <span>{renderInlineWithLinks(line.slice(6))}</span>
          </div>,
        )
        continue
      }
      if (line.startsWith('- ')) {
        nodes.push(
          <div className="md-bullet" key={`li-${index}`}>
            <span className="md-dot">•</span>
            <span>{renderInlineWithLinks(line.slice(2))}</span>
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
          {renderInlineWithLinks(line)}
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

  function moveTabByDrop(
    noteId: string,
    fromPaneId: string,
    toPaneId: string,
    targetIndex: number,
  ): void {
    const sourcePane = editorPanes.find((pane) => pane.id === fromPaneId)
    const destinationPane = editorPanes.find((pane) => pane.id === toPaneId)
    if (!sourcePane || !destinationPane) {
      return
    }
    const sourceIndex = sourcePane.tabIds.indexOf(noteId)
    if (sourceIndex === -1) {
      return
    }

    const nextPanes = editorPanes.map((pane) => ({
      ...pane,
      tabIds: [...pane.tabIds],
    }))
    const source = nextPanes.find((pane) => pane.id === fromPaneId)
    const destination = nextPanes.find((pane) => pane.id === toPaneId)
    if (!source || !destination) {
      return
    }

    source.tabIds.splice(sourceIndex, 1)
    let insertionIndex = Math.max(0, Math.min(targetIndex, destination.tabIds.length))
    if (source.id === destination.id && sourceIndex < insertionIndex) {
      insertionIndex -= 1
    }
    const destinationHasNote = destination.tabIds.includes(noteId)
    if (!destinationHasNote) {
      destination.tabIds.splice(insertionIndex, 0, noteId)
    }

    if (source.activeNoteId === noteId) {
      source.activeNoteId = source.tabIds[0] ?? ''
    }
    destination.activeNoteId = noteId

    const cleanedPanes =
      source.id !== destination.id && source.tabIds.length === 0 && nextPanes.length > 1
        ? nextPanes.filter((pane) => pane.id !== source.id)
        : nextPanes
    commitPaneLayout(cleanedPanes, destination.id)
    setStatusLine(source.id === destination.id ? 'Reordered tab' : 'Moved tab between panes')
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
      setClosedTabsStack((current) => [{ noteId, paneId, closedAt: Date.now() }, ...current].slice(0, 100))
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
    setClosedTabsStack((current) => [{ noteId, paneId, closedAt: Date.now() }, ...current].slice(0, 100))
    commitPaneLayout(nextPanes, focusPaneId)
  }

  function undoCloseTab(): void {
    const last = closedTabsStack[0]
    if (!last) {
      setStatusLine('No recently closed tab')
      return
    }
    const destinationPane =
      editorPanes.find((pane) => pane.id === last.paneId) ?? editorPanes[0]
    if (!destinationPane) {
      return
    }
    setClosedTabsStack((current) => current.slice(1))
    openNote(last.noteId, 'undo close tab', false, destinationPane.id)
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
    if (content !== note.content) {
      setLocalHistorySnapshots((current) => {
        const now = Date.now()
        const lastForNote = current.find((snapshot) => snapshot.noteId === noteId)
        if (lastForNote && now - lastForNote.timestamp < 45_000) {
          return current
        }
        const next: LocalHistorySnapshot[] = [
          {
            id: `snapshot-${now}-${Math.random().toString(16).slice(2, 8)}`,
            noteId,
            timestamp: now,
            content: note.content,
          },
          ...current,
        ]
        return next.slice(0, 1200)
      })
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

  function linkUnlinkedMention(targetNote: VaultNote): void {
    if (!activeNote) {
      return
    }
    const mentionPattern = new RegExp(`\\b${escapeRegExp(targetNote.title)}\\b`)
    if (!mentionPattern.test(activeNote.content)) {
      setStatusLine(`No unlinked mention for ${targetNote.title}`)
      return
    }
    const next = activeNote.content.replace(mentionPattern, `[[${targetNote.title}]]`)
    updateNoteContent(activeNote.id, next)
    setStatusLine(`Linked mention to ${targetNote.title}`)
  }

  function saveCurrentWorkspacePreset(name: string): void {
    const trimmed = name.trim()
    if (!trimmed) {
      setStatusLine('Workspace name is required')
      return
    }
    const layout: PersistedWorkspaceLayout = {
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
    }
    const now = Date.now()
    setWorkspacePresets((current) => {
      const existing = current.find((preset) => preset.name.toLowerCase() === trimmed.toLowerCase())
      const nextPreset: WorkspacePreset = {
        id: existing?.id ?? `workspace-${now}`,
        name: trimmed,
        layout,
        panes: editorPanes,
        updatedAt: formatNow(),
      }
      if (existing) {
        return current.map((preset) => (preset.id === existing.id ? nextPreset : preset))
      }
      return [nextPreset, ...current].slice(0, 40)
    })
    setWorkspacePresetName('')
    setStatusLine(`Saved workspace preset ${trimmed}`)
  }

  function loadWorkspacePreset(presetId: string): void {
    const preset = workspacePresets.find((entry) => entry.id === presetId)
    if (!preset) {
      return
    }
    setNotes(preset.layout.notes)
    setPinnedTabs(preset.layout.pinnedTabs)
    setRecentNotes(preset.layout.recentNotes)
    setHistoryBack(preset.layout.historyBack)
    setHistoryForward(preset.layout.historyForward)
    setLeftSidebarVisible(preset.layout.leftSidebarVisible)
    setRightSidebarVisible(preset.layout.rightSidebarVisible)
    setEditorMode(preset.layout.editorMode)
    setTheme(preset.layout.theme)
    setCommandHistory(preset.layout.commandHistory)
    commitPaneLayout(preset.panes, preset.panes[0]?.id ?? MAIN_EDITOR_PANE_ID)
    setWorkspaceManagerOpen(false)
    setStatusLine(`Loaded workspace preset ${preset.name}`)
  }

  function deleteWorkspacePreset(presetId: string): void {
    setWorkspacePresets((current) => current.filter((preset) => preset.id !== presetId))
  }

  function restoreHistorySnapshot(snapshotId: string): void {
    const snapshot = localHistorySnapshots.find((item) => item.id === snapshotId)
    if (!snapshot) {
      return
    }
    updateNoteContent(snapshot.noteId, snapshot.content)
    openNote(snapshot.noteId, 'local history restore')
    setHistoryModalOpen(false)
    setStatusLine('Restored local history snapshot')
  }

  function insertTemplateById(templateId: string): void {
    const template = templates.find((item) => item.id === templateId)
    if (!template) {
      return
    }
    const now = new Date()
    const applied = template.content
      .replaceAll('{{date}}', formatDateByPattern(now, '%Y-%m-%d'))
      .replaceAll('{{time}}', formatNow())
    insertAtCursor(applied, `template:${template.name}`)
    setTemplatesOpen(false)
  }

  function addBookmarkForActiveNote(): void {
    if (!activeNote) {
      return
    }
    setBookmarks((current) => {
      if (current.some((item) => item.type === 'note' && item.noteId === activeNote.id)) {
        return current
      }
      return [
        {
          id: `bookmark-${Date.now()}`,
          type: 'note',
          label: activeNote.title,
          noteId: activeNote.id,
        },
        ...current,
      ]
    })
    setStatusLine(`Bookmarked ${activeNote.title}`)
  }

  function addSearchBookmark(query: string): void {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    setBookmarks((current) => [
      {
        id: `bookmark-search-${Date.now()}`,
        type: 'search',
        label: `Search: ${trimmed}`,
        query: trimmed,
      },
      ...current,
    ])
    setStatusLine('Bookmarked search query')
  }

  function removeBookmark(bookmarkId: string): void {
    setBookmarks((current) => current.filter((item) => item.id !== bookmarkId))
  }

  function extractSelectionToNote(): void {
    if (!activeNote) {
      return
    }
    const editor = editorRef.current
    if (!editor) {
      setStatusLine('Select text in source mode first')
      return
    }
    const start = editor.selectionStart
    const end = editor.selectionEnd
    if (start === end) {
      setStatusLine('Select text to extract')
      return
    }
    const selected = activeNote.content.slice(start, end)
    const extractedTitle = composerNewTitle.trim() || `Extracted ${formatNow()}`
    const newPath = `00 Inbox/${extractedTitle.replaceAll(/[^A-Za-z0-9 _-]/g, '').trim() || 'extracted-note'}.md`
    const newNote = ensureNoteByPath(newPath, `# ${extractedTitle}`)
    updateNoteContent(newNote.id, `# ${extractedTitle}\n\n${selected.trim()}\n`)
    const replacement = `[[${newNote.title}]]`
    const next = `${activeNote.content.slice(0, start)}${replacement}${activeNote.content.slice(end)}`
    updateNoteContent(activeNote.id, next)
    openNote(newNote.id, 'note composer extract')
    setComposerNewTitle('')
    setNoteComposerOpen(false)
    setStatusLine(`Extracted selection to ${newNote.title}`)
  }

  function mergeActiveWithTarget(targetId: string): void {
    if (!activeNote || !targetId || targetId === activeNote.id) {
      return
    }
    const target = notesById.get(targetId)
    if (!target) {
      return
    }
    const merged = `${activeNote.content}\n\n---\n\n${target.content}`
    updateNoteContent(activeNote.id, merged)
    setNotes((current) => current.filter((note) => note.id !== target.id))
    const nextPanes = editorPanes
      .map((pane) => {
        const nextTabs = pane.tabIds.filter((tabId) => tabId !== target.id)
        const nextActive = pane.activeNoteId === target.id ? (nextTabs[0] ?? activeNote.id) : pane.activeNoteId
        return { ...pane, tabIds: nextTabs, activeNoteId: nextActive }
      })
      .filter((pane) => pane.tabIds.length > 0)
    commitPaneLayout(nextPanes, activePaneId)
    setNoteComposerOpen(false)
    setStatusLine(`Merged ${target.title} into ${activeNote.title}`)
  }

  function moveRibbonAction(
    section: 'primary' | 'secondary',
    actionId: string,
    direction: -1 | 1,
  ): void {
    setRibbonConfig((current) => {
      const key = section === 'primary' ? 'primaryActionIds' : 'secondaryActionIds'
      const source = [...current[key]]
      const index = source.indexOf(actionId)
      if (index === -1) {
        return current
      }
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= source.length) {
        return current
      }
      const swapped = source[targetIndex]
      source[targetIndex] = actionId
      source[index] = swapped
      return {
        ...current,
        [key]: source,
      }
    })
  }

  function ensureCanvasCards(): void {
    if (canvasCards.length > 0 || notes.length === 0) {
      return
    }
    const seeded = notes.slice(0, 18).map((note, index) => ({
      noteId: note.id,
      x: 60 + (index % 6) * 220,
      y: 80 + Math.floor(index / 6) * 160,
    }))
    setCanvasCards(seeded)
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
      case 'search:open-dsl':
        setSearchModalOpen(true)
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
      case 'bookmarks:open':
        setBookmarksOpen(true)
        return
      case 'bookmarks:add-active':
        addBookmarkForActiveNote()
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
      case 'workspace:manage-presets':
        setWorkspaceManagerOpen(true)
        return
      case 'editor:open-local-history':
        setHistoryNoteId(activeNoteId)
        setHistoryModalOpen(true)
        return
      case 'templates:open':
        setTemplatesOpen(true)
        return
      case 'note-composer:open':
        setComposerTargetId((current) =>
          current || notes.find((note) => note.id !== activeNoteId)?.id || '',
        )
        setNoteComposerOpen(true)
        return
      case 'workspace:undo-close-tab':
        undoCloseTab()
        return
      case 'workspace:toggle-stacked-tabs':
        setStackedTabs((value) => !value)
        return
      case 'ribbon:configure':
        setRibbonConfigOpen(true)
        return
      case 'bases:open':
        setBasesOpen(true)
        return
      case 'canvas:open':
        ensureCanvasCards()
        setCanvasOpen(true)
        return
      case 'search:save-current':
        addSearchBookmark(searchDslQuery)
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
      id: 'search:open-dsl',
      name: 'Open search',
      hotkey: commandHotkey('search:open-dsl', 'Mod+Shift+F'),
      description: 'Open global search with scoped DSL filters',
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
      id: 'bookmarks:open',
      name: 'Open bookmarks',
      hotkey: commandHotkey('bookmarks:open', 'Mod+Shift+B'),
      description: 'Open bookmark manager for notes and saved searches',
    },
    {
      id: 'bookmarks:add-active',
      name: 'Bookmark active note',
      hotkey: commandHotkey('bookmarks:add-active', 'Mod+Alt+B'),
      description: 'Add the active note to bookmarks',
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
    {
      id: 'workspace:manage-presets',
      name: 'Open workspace manager',
      hotkey: commandHotkey('workspace:manage-presets', 'Mod+Shift+W'),
      description: 'Save, load, and delete workspace presets',
    },
    {
      id: 'editor:open-local-history',
      name: 'Open local history',
      hotkey: commandHotkey('editor:open-local-history', 'Mod+Shift+H'),
      description: 'Restore previous snapshots of a note',
    },
    {
      id: 'templates:open',
      name: 'Open templates',
      hotkey: commandHotkey('templates:open', 'Mod+Shift+M'),
      description: 'Insert reusable templates into the active note',
    },
    {
      id: 'note-composer:open',
      name: 'Open note composer',
      hotkey: commandHotkey('note-composer:open', 'Mod+Shift+X'),
      description: 'Extract selected text or merge notes',
    },
    {
      id: 'workspace:undo-close-tab',
      name: 'Undo close tab',
      hotkey: commandHotkey('workspace:undo-close-tab', 'Mod+Alt+T'),
      description: 'Reopen the most recently closed tab',
    },
    {
      id: 'workspace:toggle-stacked-tabs',
      name: 'Toggle stacked tabs',
      hotkey: commandHotkey('workspace:toggle-stacked-tabs', 'Mod+Alt+S'),
      description: 'Toggle wrapped tab rows like Obsidian stacked tabs',
    },
    {
      id: 'ribbon:configure',
      name: 'Configure ribbon',
      hotkey: commandHotkey('ribbon:configure', 'Mod+Alt+R'),
      description: 'Reorder primary and secondary ribbon actions',
    },
    {
      id: 'bases:open',
      name: 'Open bases',
      hotkey: commandHotkey('bases:open', 'Mod+Shift+Q'),
      description: 'Open structured note table/list/cards views',
    },
    {
      id: 'canvas:open',
      name: 'Open canvas',
      hotkey: commandHotkey('canvas:open', 'Mod+Shift+U'),
      description: 'Open visual card workspace for notes',
    },
    {
      id: 'search:save-current',
      name: 'Bookmark search query',
      hotkey: commandHotkey('search:save-current', 'Mod+Alt+F'),
      description: 'Save the current search DSL query as a bookmark',
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
    saveWorkspacePresets(workspacePresets)
  }, [workspacePresets])

  useEffect(() => {
    saveLocalHistorySnapshots(localHistorySnapshots)
  }, [localHistorySnapshots])

  useEffect(() => {
    saveBookmarks(bookmarks)
  }, [bookmarks])

  useEffect(() => {
    saveTemplates(templates)
  }, [templates])

  useEffect(() => {
    saveRibbonConfig(ribbonConfig)
  }, [ribbonConfig])

  useEffect(() => {
    saveStackedTabs(stackedTabs)
  }, [stackedTabs])

  useEffect(() => {
    saveCanvasCards(canvasCards)
  }, [canvasCards])

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
    if (!canvasDragging) {
      return
    }
    const dragState = canvasDragging

    function onMouseMove(event: MouseEvent): void {
      const canvas = canvasRef.current
      if (!canvas) {
        return
      }
      const bounds = canvas.getBoundingClientRect()
      const nextX = event.clientX - bounds.left - dragState.pointerOffsetX
      const nextY = event.clientY - bounds.top - dragState.pointerOffsetY
      const clampedX = Math.max(8, Math.min(bounds.width - 220, nextX))
      const clampedY = Math.max(8, Math.min(bounds.height - 130, nextY))
      setCanvasCards((current) =>
        current.map((card) =>
          card.noteId === dragState.noteId ? { ...card, x: clampedX, y: clampedY } : card,
        ),
      )
    }

    function onMouseUp(): void {
      setCanvasDragging(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [canvasDragging])

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
          'bookmarks:open',
          'bookmarks:add-active',
          'daily-note:open-today',
          'insert:callout',
          'insert:decision-block',
          'insert:task',
          'search:open-dsl',
          'workspace:manage-presets',
          'editor:open-local-history',
          'templates:open',
          'note-composer:open',
          'workspace:undo-close-tab',
          'workspace:toggle-stacked-tabs',
          'ribbon:configure',
          'bases:open',
          'canvas:open',
          'search:save-current',
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
        <div
          className={[
            'tabbar',
            stackedTabs ? 'is-stacked' : '',
            tabDropTarget?.paneId === pane.id && tabDropTarget.index === pane.tabIds.length
              ? 'is-drop-end'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onDragOver={(event) => {
            if (!draggingTab) {
              return
            }
            event.preventDefault()
            setTabDropTarget({ paneId: pane.id, index: pane.tabIds.length })
          }}
          onDrop={(event) => {
            if (!draggingTab) {
              return
            }
            event.preventDefault()
            moveTabByDrop(
              draggingTab.noteId,
              draggingTab.fromPaneId,
              pane.id,
              pane.tabIds.length,
            )
            setDraggingTab(null)
            setTabDropTarget(null)
          }}
        >
          {pane.tabIds.map((tabId, tabIndex) => {
            const note = notesById.get(tabId)
            if (!note) {
              return null
            }
            const pinned = pinnedTabs.includes(tabId)
            const isTabActive = paneActiveNote ? paneActiveNote.id === tabId : false
            const showDropBefore =
              tabDropTarget?.paneId === pane.id && tabDropTarget.index === tabIndex
            const showDropAfter =
              tabDropTarget?.paneId === pane.id && tabDropTarget.index === tabIndex + 1
            return (
              <div
                key={tabId}
                className={[
                  isTabActive ? 'tab is-active' : 'tab',
                  showDropBefore ? 'is-drop-before' : '',
                  showDropAfter ? 'is-drop-after' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', tabId)
                  setDraggingTab({ noteId: tabId, fromPaneId: pane.id })
                  setTabDropTarget(null)
                }}
                onDragEnd={() => {
                  setDraggingTab(null)
                  setTabDropTarget(null)
                }}
                onDragOver={(event) => {
                  if (!draggingTab) {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  const bounds = event.currentTarget.getBoundingClientRect()
                  const before = event.clientX < bounds.left + bounds.width / 2
                  setTabDropTarget({
                    paneId: pane.id,
                    index: before ? tabIndex : tabIndex + 1,
                  })
                }}
                onDrop={(event) => {
                  if (!draggingTab) {
                    return
                  }
                  event.preventDefault()
                  event.stopPropagation()
                  const bounds = event.currentTarget.getBoundingClientRect()
                  const before = event.clientX < bounds.left + bounds.width / 2
                  moveTabByDrop(
                    draggingTab.noteId,
                    draggingTab.fromPaneId,
                    pane.id,
                    before ? tabIndex : tabIndex + 1,
                  )
                  setDraggingTab(null)
                  setTabDropTarget(null)
                }}
              >
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
                {renderMarkdownInteractive(paneActiveNote.content)}
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
          <button type="button" onClick={() => setSearchModalOpen(true)}>
            Search
          </button>
          <button type="button" onClick={() => setCommandPaletteOpen(true)}>
            Command Palette
          </button>
          <button type="button" onClick={() => setBookmarksOpen(true)}>
            Bookmarks
          </button>
          <button type="button" onClick={() => setWorkspaceManagerOpen(true)}>
            Workspaces
          </button>
          <button type="button" onClick={() => setGraphOpen(true)}>
            Graph
          </button>
          <button
            type="button"
            onClick={() => {
              ensureCanvasCards()
              setCanvasOpen(true)
            }}
          >
            Canvas
          </button>
          <button type="button" onClick={() => setBasesOpen(true)}>
            Bases
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
            {ribbonPrimaryActions.map((action) => (
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
            {ribbonSecondaryActions.map((action) => (
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
                  <h3>Unlinked Mentions</h3>
                  <ul>
                    {unlinkedMentions.length === 0 && <li className="muted">No unlinked mentions</li>}
                    {unlinkedMentions.map((note) => (
                      <li key={`mention-${note.id}`}>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => linkUnlinkedMention(note)}
                        >
                          Link {note.title}
                        </button>
                      </li>
                    ))}
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

      {searchModalOpen && (
        <div className="overlay" onClick={() => setSearchModalOpen(false)} role="presentation">
          <section
            className="modal switcher search-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Search</h2>
              <button type="button" onClick={() => setSearchModalOpen(false)}>
                Close
              </button>
            </header>
            <input
              autoFocus
              className="search-input"
              type="text"
              value={searchDslQuery}
              onChange={(event) => setSearchDslQuery(event.target.value)}
              placeholder="token search (tag:, path:, title:, task:, property:, text:)"
            />
            <div className="query-help">
              <span>tag:#project</span>
              <span>path:01 Projects</span>
              <span>task:todo</span>
              <span>-tag:#archive</span>
            </div>
            <div className="capture-actions">
              <button
                type="button"
                disabled={searchDslQuery.trim() === ''}
                onClick={() => addSearchBookmark(searchDslQuery)}
              >
                Bookmark Query
              </button>
            </div>
            <div className="modal-list">
              {searchResults.map((result) => (
                <button
                  key={`search-${result.noteId}`}
                  type="button"
                  className="command-row"
                  onClick={() => {
                    openNote(result.noteId, `search:${result.title}`)
                    setSearchModalOpen(false)
                  }}
                >
                  <div>
                    <strong>{result.title}</strong>
                    <p>{result.path}</p>
                    <small>{result.snippet}</small>
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && (
                <p className="muted search-empty">No search matches for the current query.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {workspaceManagerOpen && (
        <div className="overlay" onClick={() => setWorkspaceManagerOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Workspace Manager</h2>
              <button type="button" onClick={() => setWorkspaceManagerOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <label className="binding-row">
                <span>Preset Name</span>
                <input
                  type="text"
                  value={workspacePresetName}
                  onChange={(event) => setWorkspacePresetName(event.target.value)}
                  placeholder="Sprint review context"
                />
              </label>
              <div className="capture-actions">
                <button type="button" onClick={() => saveCurrentWorkspacePreset(workspacePresetName)}>
                  Save Current Layout
                </button>
              </div>
              <section className="inspector-card">
                <h3>Saved Workspaces</h3>
                {workspacePresets.length === 0 && <p className="muted">No saved workspaces yet.</p>}
                {workspacePresets.length > 0 && (
                  <ul>
                    {workspacePresets.map((preset) => (
                      <li key={preset.id} className="workspace-row">
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => loadWorkspacePreset(preset.id)}
                        >
                          {preset.name}
                        </button>
                        <small>{preset.updatedAt}</small>
                        <button type="button" onClick={() => deleteWorkspacePreset(preset.id)}>
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      {historyModalOpen && (
        <div className="overlay" onClick={() => setHistoryModalOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Local History</h2>
              <button type="button" onClick={() => setHistoryModalOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <label className="binding-row">
                <span>Note</span>
                <select
                  value={selectedHistoryNoteId}
                  onChange={(event) => setHistoryNoteId(event.target.value)}
                >
                  {notes.map((note) => (
                    <option key={`history-note-${note.id}`} value={note.id}>
                      {note.title}
                    </option>
                  ))}
                </select>
              </label>
              <section className="inspector-card">
                <h3>Snapshots</h3>
                {historySnapshotsForSelectedNote.length === 0 && (
                  <p className="muted">No local history snapshots for this note yet.</p>
                )}
                {historySnapshotsForSelectedNote.length > 0 && (
                  <ul>
                    {historySnapshotsForSelectedNote.map((snapshot) => (
                      <li key={snapshot.id} className="history-row">
                        <div>
                          <strong>{new Date(snapshot.timestamp).toLocaleString()}</strong>
                          <p>{firstMatchingSnippet(snapshot.content, '')}</p>
                        </div>
                        <button type="button" onClick={() => restoreHistorySnapshot(snapshot.id)}>
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      {templatesOpen && (
        <div className="overlay" onClick={() => setTemplatesOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Templates</h2>
              <button type="button" onClick={() => setTemplatesOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-actions">
              <button type="button" onClick={() => setTemplates(DEFAULT_TEMPLATES)}>
                Reset Defaults
              </button>
            </div>
            <div className="modal-list">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className="command-row"
                  onClick={() => insertTemplateById(template.id)}
                >
                  <div>
                    <strong>{template.name}</strong>
                    <small>{template.content.slice(0, 120)}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {bookmarksOpen && (
        <div className="overlay" onClick={() => setBookmarksOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Bookmarks</h2>
              <button type="button" onClick={() => setBookmarksOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <div className="capture-actions">
                <button type="button" onClick={() => addBookmarkForActiveNote()}>
                  Add Active Note
                </button>
              </div>
              <section className="inspector-card">
                <h3>Saved</h3>
                {bookmarks.length === 0 && <p className="muted">No bookmarks saved.</p>}
                {bookmarks.length > 0 && (
                  <ul>
                    {bookmarks.map((bookmark) => (
                      <li key={bookmark.id} className="bookmark-row">
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => {
                            if (bookmark.type === 'note' && bookmark.noteId) {
                              openNote(bookmark.noteId, `bookmark:${bookmark.label}`)
                              setBookmarksOpen(false)
                              return
                            }
                            if (bookmark.type === 'search' && bookmark.query) {
                              setSearchDslQuery(bookmark.query)
                              setSearchModalOpen(true)
                              setBookmarksOpen(false)
                            }
                          }}
                        >
                          {bookmark.label}
                        </button>
                        <button type="button" onClick={() => removeBookmark(bookmark.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      {noteComposerOpen && (
        <div className="overlay" onClick={() => setNoteComposerOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Note Composer</h2>
              <button type="button" onClick={() => setNoteComposerOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body">
              <section className="inspector-card">
                <h3>Extract Selection</h3>
                <label className="binding-row">
                  <span>New Note Title</span>
                  <input
                    type="text"
                    value={composerNewTitle}
                    onChange={(event) => setComposerNewTitle(event.target.value)}
                    placeholder="Architecture decision details"
                  />
                </label>
                <div className="capture-actions">
                  <button type="button" onClick={() => extractSelectionToNote()}>
                    Extract to New Note
                  </button>
                </div>
              </section>
              <section className="inspector-card">
                <h3>Merge Another Note into Active</h3>
                <label className="binding-row">
                  <span>Merge Source</span>
                  <select
                    value={composerTargetId}
                    onChange={(event) => setComposerTargetId(event.target.value)}
                  >
                    <option value="">Select note</option>
                    {notes
                      .filter((note) => note.id !== activeNoteId)
                      .map((note) => (
                        <option key={`composer-${note.id}`} value={note.id}>
                          {note.title}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="capture-actions">
                  <button
                    type="button"
                    disabled={!composerTargetId}
                    onClick={() => mergeActiveWithTarget(composerTargetId)}
                  >
                    Merge
                  </button>
                </div>
              </section>
            </div>
          </section>
        </div>
      )}

      {ribbonConfigOpen && (
        <div className="overlay" onClick={() => setRibbonConfigOpen(false)} role="presentation">
          <section
            className="modal switcher"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Ribbon Configuration</h2>
              <button type="button" onClick={() => setRibbonConfigOpen(false)}>
                Close
              </button>
            </header>
            <div className="capture-modal-body ribbon-config-grid">
              <section className="inspector-card">
                <h3>Primary Ribbon</h3>
                <ul>
                  {ribbonPrimaryActions.map((action) => (
                    <li key={`ribbon-primary-${action.id}`} className="ribbon-config-row">
                      <span>
                        {action.glyph} {action.label}
                      </span>
                      <div className="ribbon-config-actions">
                        <button
                          type="button"
                          onClick={() => moveRibbonAction('primary', action.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRibbonAction('primary', action.id, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="inspector-card">
                <h3>Bottom Ribbon</h3>
                <ul>
                  {ribbonSecondaryActions.map((action) => (
                    <li key={`ribbon-secondary-${action.id}`} className="ribbon-config-row">
                      <span>
                        {action.glyph} {action.label}
                      </span>
                      <div className="ribbon-config-actions">
                        <button
                          type="button"
                          onClick={() => moveRibbonAction('secondary', action.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveRibbonAction('secondary', action.id, 1)}
                        >
                          ↓
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </section>
        </div>
      )}

      {basesOpen && (
        <div className="overlay" onClick={() => setBasesOpen(false)} role="presentation">
          <section
            className="modal settings-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Bases</h2>
              <button type="button" onClick={() => setBasesOpen(false)}>
                Close
              </button>
            </header>
            <div className="bases-toolbar">
              <input
                className="search-input"
                type="text"
                value={basesQuery}
                onChange={(event) => setBasesQuery(event.target.value)}
                placeholder="Filter by title, path, or tag"
              />
              <select
                value={basesViewMode}
                onChange={(event) => setBasesViewMode(event.target.value as BasesViewMode)}
              >
                <option value="table">Table</option>
                <option value="list">List</option>
                <option value="cards">Cards</option>
              </select>
              <select
                value={basesSortKey}
                onChange={(event) =>
                  setBasesSortKey(event.target.value as 'title' | 'path' | 'updated')
                }
              >
                <option value="updated">Sort by updated</option>
                <option value="title">Sort by title</option>
                <option value="path">Sort by path</option>
              </select>
            </div>
            <div className="bases-body">
              {basesViewMode === 'table' && (
                <div className="bases-table-wrap">
                  <table className="bases-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Path</th>
                        <th>Tags</th>
                        <th>Words</th>
                        <th>Links</th>
                        <th>Fields</th>
                        <th>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBasesRows.map((row) => (
                        <tr key={`base-row-${row.noteId}`}>
                          <td>
                            <button
                              type="button"
                              className="inline-link"
                              onClick={() => {
                                openNote(row.noteId, `bases:${row.title}`)
                                setBasesOpen(false)
                              }}
                            >
                              {row.title}
                            </button>
                          </td>
                          <td>{row.path}</td>
                          <td>{row.tags}</td>
                          <td>{row.words}</td>
                          <td>{row.links}</td>
                          <td>{row.fields}</td>
                          <td>{row.updatedAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {basesViewMode === 'list' && (
                <div className="bases-list">
                  {filteredBasesRows.map((row) => (
                    <button
                      key={`base-list-${row.noteId}`}
                      type="button"
                      className="graph-node-row"
                      onClick={() => {
                        openNote(row.noteId, `bases:${row.title}`)
                        setBasesOpen(false)
                      }}
                    >
                      <span>{row.title}</span>
                      <span className="graph-pill">{row.path}</span>
                    </button>
                  ))}
                </div>
              )}
              {basesViewMode === 'cards' && (
                <div className="bases-cards">
                  {filteredBasesRows.map((row) => (
                    <button
                      key={`base-card-${row.noteId}`}
                      type="button"
                      className="bases-card"
                      onClick={() => {
                        openNote(row.noteId, `bases:${row.title}`)
                        setBasesOpen(false)
                      }}
                    >
                      <strong>{row.title}</strong>
                      <small>{row.path}</small>
                      <span>
                        {row.words} words • {row.links} links • {row.fields} fields
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {canvasOpen && (
        <div className="overlay" onClick={() => setCanvasOpen(false)} role="presentation">
          <section
            className="modal canvas-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header>
              <h2>Canvas</h2>
              <button type="button" onClick={() => setCanvasOpen(false)}>
                Close
              </button>
            </header>
            <div className="canvas-toolbar">
              <span>{canvasCards.length} cards</span>
              <button
                type="button"
                onClick={() => {
                  ensureCanvasCards()
                  setStatusLine('Seeded canvas with note cards')
                }}
              >
                Seed Cards
              </button>
            </div>
            <div className="canvas-surface" ref={canvasRef}>
              {canvasCards.map((card) => {
                const note = notesById.get(card.noteId)
                if (!note) {
                  return null
                }
                return (
                  <article
                    key={`canvas-${card.noteId}`}
                    className="canvas-card"
                    style={{ left: `${card.x}px`, top: `${card.y}px` }}
                    onMouseDown={(event) => {
                      const bounds = event.currentTarget.getBoundingClientRect()
                      setCanvasDragging({
                        noteId: card.noteId,
                        pointerOffsetX: event.clientX - bounds.left,
                        pointerOffsetY: event.clientY - bounds.top,
                      })
                    }}
                    onDoubleClick={() => {
                      openNote(card.noteId, `canvas:${note.title}`)
                      setCanvasOpen(false)
                    }}
                  >
                    <h3>{note.title}</h3>
                    <p>{note.path}</p>
                    <button
                      type="button"
                      onClick={() => {
                        openNote(card.noteId, `canvas:${note.title}`)
                        setCanvasOpen(false)
                      }}
                    >
                      Open
                    </button>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {hoverPreview && hoverPreviewNote && (
        <aside
          className="hover-preview"
          style={{
            left: hoverPreview.x,
            top: hoverPreview.y,
          }}
        >
          <header>
            <strong>{hoverPreviewNote.title}</strong>
            <small>{hoverPreviewNote.path}</small>
          </header>
          <div className="hover-preview-body">
            {renderMarkdown(
              hoverPreviewNote.content
                .split('\n')
                .slice(0, 14)
                .join('\n'),
            )}
          </div>
        </aside>
      )}
    </main>
  )
}

export default App
