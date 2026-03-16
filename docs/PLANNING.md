# Planning Decisions

These planning docs now assume `Thoughtforge` is the selected working name and that the stack and architecture choices from the initial recommendation set are adopted as the baseline.

## 1. Decisions You Do Not Want to Leave Fuzzy

These are the decisions teams usually postpone and then pay for later.

### 1.1 Canonical Storage Contract

Decide exactly what is canonical:

- Markdown note body
- frontmatter shape
- attachment path rules
- block ID encoding
- task syntax

If this drifts, import/export and editor trust both break.

### 1.2 Stable Identity Strategy

Decide how notes, blocks, entities, tasks, and intents get stable IDs. Do not use file paths or titles as identity.

### 1.3 Agent Trust and Approval Model

Decide:

- what actions are auto-allowed
- what actions require approval
- what actions are never allowed
- how scope inheritance works inside a workflow

This is core product design, not polish.

### 1.4 Retrieval Quality Evaluation

You are building a system whose value depends on whether an agent actually understands the workspace.

That means you need a benchmark suite early:

- retrieval relevance tests
- note-to-entity extraction accuracy tests
- task and intent planning quality tests
- citation and provenance validation

### 1.5 Migration Strategy from Obsidian

This matters more than it looks.

Decide:

- which Obsidian conventions are first-class
- how unsupported plugin syntax is handled
- whether import rewrites files or overlays metadata
- what breaks and how it is reported

### 1.6 Plugin Security Model

Decide whether plugins run:

- in the frontend only
- in a sandboxed host
- with signed permissions

Do not expose raw filesystem or shell access casually.

### 1.7 Local Versus Remote AI Policy

Decide product modes:

- local-only mode
- hybrid mode
- remote-allowed mode

Then decide how no-send folders, redaction, and provider approvals work.

### 1.8 Sync Business Logic

If sync exists later, decide whether the sync layer is:

- file sync aware
- CRDT document aware
- projection aware

Do not let sync become an accidental rewrite of the storage model.

### 1.9 Trademark and Naming Risk

Be careful with anything too close to "Obsidian". Similar names may create avoidable trademark and brand confusion.

### 1.10 Licensing and Commercial Strategy

Decide early:

- source-available or open source
- plugin ecosystem licensing
- cloud add-ons versus local-only paid app
- sync pricing if sync exists

## 2. Recommended Product Roadmap

### Phase 0: Definition

Outcome:

- lock product thesis
- lock canonical storage contract
- lock architecture and repo layout
- define benchmark vaults and acceptance criteria

### Phase 1: Core Local Vault

Outcome:

- vault open/create
- Markdown-native editor
- wikilinks and backlinks
- search
- graph basics
- tasks and projects
- external edit detection

Exit criteria:

- power user can migrate a small Obsidian vault and keep working

### Phase 2: Agent-Native Workspace

Outcome:

- note-aware command palette
- intent objects
- agent read/search/summarize flows
- proposed edits with diff review
- provenance and audit log
- local model integration

Exit criteria:

- a user can work with the agent from the workspace without depending on chat

### Phase 3: Structured Knowledge Layer

Outcome:

- typed entities
- relationship extraction
- semantic retrieval
- resurfacing and review workflows
- more powerful project and goal views

Exit criteria:

- the system produces materially better context retrieval than plain note search

### Phase 4: Collaboration and Ecosystem

Outcome:

- sync adapters
- shared sessions
- plugin API
- deeper external integrations

Exit criteria:

- extensibility does not compromise trust or portability

## 3. Suggested Success Metrics

### User Value Metrics

- time from launch to first captured thought
- frequency of backlink and search usage
- percentage of agent outputs accepted without heavy rewrite
- number of tasks or plans created from workspace context
- return rate to resurfaced notes

### System Quality Metrics

- vault open time
- search latency
- indexing throughput
- crash recovery success rate
- percentage of agent edits with valid citations
- false-positive entity extraction rate

## 4. Biggest Product Risks

### Risk 1: Becoming a Worse Obsidian

If the app is slower, less portable, or less scriptable, users will not switch just for AI.

Mitigation:

- make local-first portability non-negotiable
- make keyboard workflows excellent
- ship import compatibility early

### Risk 2: Becoming Just Another Chat UI

If the main experience becomes chat-first, the product loses its thesis.

Mitigation:

- center notes, graph, tasks, and intent views
- let agents act from context panels, selections, and documents

### Risk 3: Too Much Structure Too Early

If every thought must fit a schema, capture becomes slow and unnatural.

Mitigation:

- keep freeform notes primary
- project structure out of notes rather than forcing it up front

### Risk 4: Agent Trust Failure

One bad destructive action can permanently damage adoption.

Mitigation:

- approval gates
- reversible changes
- provenance
- least privilege by default

### Risk 5: Sync Complexity Explosion

Sync can consume the roadmap if started too early.

Mitigation:

- ship strong offline single-user core first
- design sync boundaries now but implement later

## 5. Locked Baseline Decisions

These are the defaults to lock for implementation:

- Product name: Thoughtforge, pending formal trademark and domain clearance
- App type: desktop-first, macOS-first, cross-platform architecture
- Canonical data: Markdown plus frontmatter
- Native core: Rust
- Shell: Tauri 2
- UI: React 19 plus TypeScript
- Editor: Tiptap plus ProseMirror
- Search: SQLite FTS5 first, semantic second
- Sync: not in MVP
- Agent runtime: local-first with provider abstraction
- Plugin model: limited internal plugin API first, public marketplace later

## 6. Strategic Questions for the Next Pass

These are the best follow-up planning questions after this document set:

1. What is the exact canonical markdown and metadata contract?
2. What are the top five agent actions we want to make magical in v1?
3. What are the import compatibility guarantees for Obsidian vaults?
4. What approval UX do we want for agent edits and external actions?
5. What is the minimum plugin API needed for launch?
6. What benchmark vault will we use to measure "agent understands my workspace"?
