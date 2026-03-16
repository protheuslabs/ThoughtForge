# Software Requirements Specification

## 1. Document Control

- Product: Thoughtforge
- Document type: Software Requirements Specification
- Version: 0.1
- Date: 2026-03-15
- Status: Draft for product-definition phase

## 2. Purpose

Thoughtforge is a local-first desktop application that acts as a second brain for humans and a durable context layer for agents. It must let users think, write, organize, retrieve, and act from their knowledge base in a way that is at least as capable as Obsidian for core note workflows while being materially better for agent collaboration.

## 3. Scope

The product includes:

- Personal knowledge management
- Markdown-native note authoring and organization
- Knowledge graph and structured context extraction
- Agent-readable context and tool surfaces
- Task, project, and intent management inside the workspace
- Search, retrieval, resurfacing, and summarization
- Import/export and migration paths
- Local-first operation with optional sync and optional remote model use

The product does not initially include:

- Mandatory cloud storage
- Always-on remote backends
- Social publishing features
- Marketplace-scale third-party plugin distribution at launch

## 4. Goals

### 4.1 Product Goals

- Match or exceed Obsidian on core single-user knowledge-work workflows.
- Make the workspace a better interface to an agentic system than chat alone.
- Preserve user ownership of data and portability of notes.
- Support fast thought capture and high-fidelity retrieval.
- Build trust through permissions, provenance, and reversibility.

### 4.2 Non-Goals for MVP

- Full multi-user collaboration suite
- Mobile-first experience
- Enterprise admin console
- Cloud-only AI features
- Public sharing platform

## 5. Stakeholders and Personas

### 5.1 Primary Stakeholders

- Founder or product owner
- End users building personal or professional second-brain systems
- Developers building agent capabilities and extensions

### 5.2 Primary Personas

- Research-heavy operator: needs capture, synthesis, resurfacing, and planning across many sources.
- Builder with an agentic workflow: wants the agent to understand project context, tasks, code notes, and intent.
- Knowledge worker with long-lived notes: cares about ownership, portability, and link-based thinking.
- Power user migrating from Obsidian: expects familiar vault concepts, fast keyboard flows, and plugin-grade extensibility.

## 6. Product Principles

- Local-first by default
- User-owned data
- Agent-native but human-legible
- Structured where valuable, flexible where necessary
- Security and permissions before autonomy
- Fast enough to feel invisible

## 7. Assumptions and Dependencies

- Users will primarily run the app on desktop operating systems.
- The canonical authored content should remain readable outside the app.
- Some users will use only local models; others will use hosted models.
- The system must tolerate external file edits and external sync tools.
- Optional sync and collaboration will be layered on top of a strong offline core.

## 8. System Overview

Thoughtforge manages one or more local vaults containing Markdown notes, attachments, and app metadata. The application parses those assets, projects structured data into SQLite, extracts entities and links into a knowledge graph, and exposes the resulting context to users and agents. Agents can read workspace context, propose transformations, and perform approved actions through a permissioned command layer.

## 9. Functional Requirements

### 9.1 Workspace and Vault Management

- FR-WV-001 (Must): The system shall allow the user to create, open, close, and switch between vaults.
  Acceptance: A user can select a local folder as a vault and reopen it later without data loss.

- FR-WV-002 (Must): The system shall treat Markdown files and asset folders as the primary user-owned content store.
  Acceptance: Notes remain readable and editable outside the app.

- FR-WV-003 (Must): The system shall store app-specific indexes, caches, and metadata separately from authored note content.
  Acceptance: Deleting app metadata does not delete note files.

- FR-WV-004 (Must): The system shall detect file additions, deletions, renames, and edits made outside the app.
  Acceptance: External edits appear in the UI without manual re-import.

- FR-WV-005 (Must): The system shall maintain an internal vault model with stable note identifiers independent of file path changes.
  Acceptance: Renaming a note preserves backlinks, tasks, and references.

- FR-WV-006 (Should): The system should support multiple root folders or mounted collections inside one workspace.
  Acceptance: A workspace may include configured subroots without flattening the file system.

- FR-WV-007 (Should): The system should support encrypted app secrets and provider credentials.
  Acceptance: API keys are stored outside note files and can be revoked.

### 9.2 Capture and Ingestion

- FR-CI-001 (Must): The system shall support instant creation of a new note from keyboard-driven flows.
  Acceptance: The user can create and open a note without leaving the keyboard.

- FR-CI-002 (Must): The system shall support append flows to inbox notes, daily notes, and selected notes.
  Acceptance: Quick capture routes content to configured targets.

- FR-CI-003 (Must): The system shall support drag-and-drop or picker-based attachment import.
  Acceptance: Images, PDFs, and other supported assets are copied or linked per workspace settings.

- FR-CI-004 (Should): The system should support clipboard web clipping with source URL and capture timestamp.
  Acceptance: Pasted web content can preserve source metadata.

- FR-CI-005 (Should): The system should support voice memo or speech-to-note capture through pluggable transcription providers.
  Acceptance: A recorded memo becomes a note with provenance metadata.

- FR-CI-006 (Should): The system should support ingestion pipelines for PDFs, web pages, code files, and transcripts.
  Acceptance: Imported sources produce notes plus extracted metadata.

### 9.3 Editor and Authoring

- FR-ED-001 (Must): The system shall provide a rich Markdown-native editor.
  Acceptance: Users can edit headings, lists, code blocks, links, quotes, tables, and embeds.

- FR-ED-002 (Must): The system shall support wikilinks and automatic backlink tracking.
  Acceptance: Creating `[[Note]]` updates the linked note graph.

- FR-ED-003 (Must): The system shall support tags, frontmatter, and inline metadata fields.
  Acceptance: Metadata is persisted and queryable.

- FR-ED-004 (Must): The system shall support block references and embeds.
  Acceptance: A user can link to or embed a specific block from another note.

- FR-ED-005 (Must): The system shall support undo, redo, autosave, and crash-safe recovery.
  Acceptance: Recent edits can be restored after abnormal shutdown.

- FR-ED-006 (Should): The system should support slash commands and command palette insertion flows.
  Acceptance: Structured blocks and actions can be inserted by command.

- FR-ED-007 (Should): The system should support split panes, tabs, and pinned views.
  Acceptance: Users can work with multiple notes simultaneously.

- FR-ED-008 (Should): The system should support custom typed blocks such as callouts, tasks, entities, and intents.
  Acceptance: Typed blocks render consistently and remain serializable.

- FR-ED-009 (Could): The system could support WYSIWYG and source modes with shared document state.
  Acceptance: Users can toggle views without content corruption.

### 9.4 Search, Retrieval, and Resurfacing

- FR-SR-001 (Must): The system shall support full-text search across note titles, bodies, tags, and metadata.
  Acceptance: Queries return ranked results with highlighted matches.

- FR-SR-002 (Must): The system shall support phrase, prefix, boolean, and scoped search.
  Acceptance: Users can search by note subset, tag, path, or field.

- FR-SR-003 (Must): The system shall support backlink discovery and linked context navigation.
  Acceptance: Users can inspect incoming and outgoing relationships for a note.

- FR-SR-004 (Should): The system should support semantic search over indexed chunks.
  Acceptance: A semantic query returns relevant notes beyond lexical term matches.

- FR-SR-005 (Should): The system should support saved searches, smart collections, and dynamic views.
  Acceptance: A saved query remains live as notes change.

- FR-SR-006 (Should): The system should support resurfacing features such as "related notes", "stale notes", and "today in memory".
  Acceptance: The app can generate ranked resurfacing panels from vault state.

- FR-SR-007 (Could): The system could support timeline and event-centric retrieval.
  Acceptance: Time-bounded queries can filter notes and activities.

### 9.5 Knowledge Graph and Structured Context

- FR-KG-001 (Must): The system shall construct a note/link graph from wikilinks, embeds, tags, and references.
  Acceptance: Graph relationships update incrementally when note content changes.

- FR-KG-002 (Must): The system shall maintain extracted entities, aliases, and relationships as a projection layer.
  Acceptance: Entity views show source notes and confidence.

- FR-KG-003 (Should): The system should support user-defined entity types such as person, project, idea, task, system, and goal.
  Acceptance: New entity schemas can be created without code changes.

- FR-KG-004 (Should): The system should support graph-based navigation and neighborhood exploration.
  Acceptance: Users can expand from a note to related entities and notes.

- FR-KG-005 (Should): The system should support provenance for extracted facts.
  Acceptance: Every extracted relation links back to one or more source passages.

- FR-KG-006 (Could): The system could support confidence-weighted graph edges and agent-suggested merges.
  Acceptance: Proposed merges require user confirmation before becoming canonical.

### 9.6 Tasks, Projects, and Intents

- FR-TI-001 (Must): The system shall support first-class tasks embedded in notes and surfaced in global task views.
  Acceptance: A checkbox task is visible both in the note and in aggregated task views.

- FR-TI-002 (Must): The system shall support project entities that group notes, tasks, and decisions.
  Acceptance: A project page can display linked assets and task state.

- FR-TI-003 (Must): The system shall support explicit intent objects representing goals, plans, and active focus.
  Acceptance: Users can create an intent and attach notes, tasks, and agent threads to it.

- FR-TI-004 (Should): The system should support status, due dates, owners, and priority metadata.
  Acceptance: Tasks and projects can be filtered and grouped by these properties.

- FR-TI-005 (Should): The system should support recurring review workflows such as daily planning and weekly review.
  Acceptance: Review templates can generate or update notes automatically.

### 9.7 Agent Workspace and Tooling

- FR-AG-001 (Must): The system shall expose vault context to internal agents through a typed retrieval and tool layer.
  Acceptance: The agent can read notes, search, inspect entities, and cite sources.

- FR-AG-002 (Must): The system shall allow agents to propose edits before applying them.
  Acceptance: The user can review a diff or action plan before approval.

- FR-AG-003 (Must): The system shall record provenance for agent-generated outputs.
  Acceptance: Generated content includes source references and model metadata.

- FR-AG-004 (Must): The system shall support permission scopes for agent actions such as read, write, rename, create, or execute.
  Acceptance: An action outside the granted scope is blocked.

- FR-AG-005 (Must): The system shall support a non-chat interaction model where the user can invoke agents from notes, selections, tasks, or intents.
  Acceptance: Agent actions can originate from workspace context without opening a chat thread.

- FR-AG-006 (Should): The system should support MCP host and client capabilities for tool and context interoperability.
  Acceptance: External agents can connect to workspace resources using MCP-compatible sessions.

- FR-AG-007 (Should): The system should support local model execution and remote provider execution behind one abstraction.
  Acceptance: The user can switch providers without changing higher-level agent workflows.

- FR-AG-008 (Should): The system should support background agent jobs such as summarization, classification, extraction, and plan generation.
  Acceptance: Jobs run asynchronously and report status.

- FR-AG-009 (Could): The system could support agent memories distinct from authored notes.
  Acceptance: Agent scratchpads remain inspectable and deletable.

### 9.8 Sync, Collaboration, and Conflict Handling

- FR-SC-001 (Must): The system shall remain fully usable offline.
  Acceptance: Note creation, editing, search, and local agent flows work without network access.

- FR-SC-002 (Must): The system shall handle concurrent changes from multiple processes without silent data loss.
  Acceptance: Conflicting updates are merged or surfaced explicitly.

- FR-SC-003 (Should): The system should support CRDT-backed collaboration for selected notes or workspaces.
  Acceptance: Two clients editing the same note eventually converge.

- FR-SC-004 (Should): The system should support sync adapters rather than a hard-coded sync backend.
  Acceptance: Different sync implementations can be swapped behind a shared interface.

- FR-SC-005 (Could): The system could support presence, cursors, and shared sessions.
  Acceptance: Live co-editing state is visible in collaborative mode.

### 9.9 Import, Export, and Interoperability

- FR-IE-001 (Must): The system shall import existing Markdown vaults with minimal restructuring.
  Acceptance: Obsidian-style vaults open with working links and attachments.

- FR-IE-002 (Must): The system shall export authored notes and attachments without vendor lock-in.
  Acceptance: A user can leave the product with human-readable files intact.

- FR-IE-003 (Should): The system should import metadata from common PKM formats such as frontmatter and task syntaxes.
  Acceptance: Recognized fields are preserved during import.

- FR-IE-004 (Should): The system should expose an extension API and internal command surface for plugins.
  Acceptance: Plugins can register commands, views, and background jobs.

- FR-IE-005 (Should): The system should support open-in-default-app and open-with-external-editor flows.
  Acceptance: The user can edit a note externally and return without desync.

### 9.10 Security, Permissions, and Privacy

- FR-SP-001 (Must): The system shall require explicit user approval for destructive or external side-effecting agent actions.
  Acceptance: An agent cannot delete notes or execute tools without approval.

- FR-SP-002 (Must): The system shall separate trusted core code from less-trusted frontend and plugin execution contexts.
  Acceptance: Sensitive operations are mediated through permissioned commands.

- FR-SP-003 (Must): The system shall support provider-level data sharing controls.
  Acceptance: Users can disable sending vault content to remote models by policy or workspace setting.

- FR-SP-004 (Must): The system shall allow users to inspect which notes, passages, or entities were exposed to a model call.
  Acceptance: Retrieval context for a request is visible after the action completes.

- FR-SP-005 (Should): The system should support redaction rules and no-send folders.
  Acceptance: Marked content is excluded from remote inference requests.

- FR-SP-006 (Should): The system should support encrypted local secret storage.
  Acceptance: Credentials are stored outside plain-text note files.

### 9.11 Observability and Evaluation

- FR-OE-001 (Must): The system shall log user-visible agent actions, approvals, denials, and failures.
  Acceptance: A user can audit what the agent attempted and what changed.

- FR-OE-002 (Should): The system should support local evaluation harnesses for retrieval quality and task completion quality.
  Acceptance: Sample benchmarks can be run against a test vault.

- FR-OE-003 (Should): The system should support optional anonymous telemetry with explicit opt-in.
  Acceptance: Telemetry is off by default in early releases.

## 10. Non-Functional Requirements

- NFR-001 Performance: The app shall open an existing medium-sized vault in under 3 seconds on a modern laptop after initial indexing.
- NFR-002 Search latency: Lexical search shall return initial results in under 150 ms for the 95th percentile on a vault with 100,000 notes or note chunks.
- NFR-003 Save latency: Ordinary typing shall feel real-time with autosave that does not visibly block the editor.
- NFR-004 Offline availability: Core note authoring and retrieval shall work without network access.
- NFR-005 Reliability: The system shall protect against corruption during crashes through journaling, transactional metadata updates, and recovery flows.
- NFR-006 Portability: Authored note content shall remain usable in plain Markdown-oriented tools.
- NFR-007 Extensibility: Core features shall expose stable internal interfaces so that plugin support can be added without major rewrites.
- NFR-008 Accessibility: Desktop UX shall target WCAG 2.2 AA where applicable, including keyboard navigation, screen-reader-readable controls, and contrast compliance.
- NFR-009 Security: Sensitive actions shall cross explicit trust boundaries and permission checks.
- NFR-010 Privacy: The user shall be able to run the product without any cloud account.
- NFR-011 Observability: Errors shall be capturable through local logs and structured diagnostics.
- NFR-012 Cross-platform support: The architecture shall support macOS, Windows, and Linux even if release sequencing starts with macOS.

## 11. External Interface Requirements

### 11.1 User Interface

- The application shall provide a desktop interface with sidebar navigation, note panes, command palette, search, graph views, and inspector panels.
- The application shall be keyboard-first, with mouse support as a complement.
- The application shall support configurable themes and typography without requiring a plugin.

### 11.2 File System Interface

- The app shall read and write notes and attachments within configured vault roots.
- The app shall watch vault file changes through platform-native file watching where available.
- The app shall isolate internal metadata from authored content.

### 11.3 AI Provider Interface

- The app shall use a provider adapter pattern for local and remote model backends.
- The app shall support a local HTTP interface for Ollama-compatible calls.
- The app shall support pluggable remote providers through explicit credential configuration.

### 11.4 Agent Tool Interface

- The app shall expose typed tools for search, read note, write note, extract entities, resolve links, list tasks, and apply structured transformations.
- The app shall support MCP-compatible resource and tool exposure.

## 12. Data Requirements

### 12.1 Canonical Authored Data

- Notes shall be stored as Markdown files.
- Metadata shall use frontmatter and structured inline fields where possible.
- Attachments shall be stored as ordinary files under workspace-controlled asset paths.

### 12.2 Projected Data

- SQLite shall store indexes, graph edges, task projections, embeddings metadata, and app state.
- Projected data shall be rebuildable from canonical files plus explicit sync state where applicable.

### 12.3 Audit Data

- Agent actions, approvals, and diffs shall be stored with timestamps and workspace-local identifiers.
- Users shall be able to clear non-canonical history without losing authored content.

## 13. Constraints

- The system must preserve portability and avoid hard vendor lock-in.
- The architecture must not assume permanent internet connectivity.
- The product must keep trust boundaries explicit because it will execute agent workflows.
- The editor model must support both human authoring and structured machine reasoning.

## 14. MVP Acceptance Criteria

MVP is acceptable when all of the following are true:

- A user can open an existing Markdown vault and continue working without migration pain.
- Note creation, editing, linking, search, and backlinks are production-usable.
- Tasks, projects, and intents can be created and queried across the workspace.
- The agent can search, read, summarize, and propose edits with provenance.
- The user can approve or deny write actions at a granular level.
- External note edits do not corrupt the workspace model.
- The app remains useful with no cloud account and no network connection.

## 15. Future Release Themes

- Real-time shared workspaces
- Advanced semantic retrieval and memory ranking
- Plugin marketplace
- Mobile companion apps
- Publishing and read-only portals
- Team policy controls and enterprise deployment

## 16. Open Risks

- Rich editor plus Markdown fidelity can become a source of complexity and user distrust if round-tripping is imperfect.
- Agent autonomy can damage trust if permissioning and provenance are weak.
- Sync and collaboration can dominate engineering cost if attempted too early.
- Over-structuring the knowledge model can slow capture and reduce adoption.

## 17. Glossary

- Vault: A user-owned collection of notes, assets, and metadata roots.
- Projection: Derived data optimized for search, graph queries, or UI use.
- Intent: A first-class object representing desired outcome, focus, or plan.
- Agent-native: Designed so software agents can understand and operate on workspace context directly.
- Local-first: The product remains useful and authoritative on the local device even when offline.
