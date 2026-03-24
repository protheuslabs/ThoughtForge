# SRS Execution Matrix

Generated from `docs/SRS.md` at `2026-03-24T21:22:36Z`.

Legend:
- `todo`: not started
- `in_progress`: currently being implemented
- `done`: implemented and verified
- `blocked`: cannot proceed pending dependency

| Requirement | Priority | Milestone | Status | Summary |
| --- | --- | --- | --- | --- |
| `FR-WV-001` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall allow the user to create, open, close, and switch between vaults. |
| `FR-WV-002` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall treat Markdown files and asset folders as the primary user-owned authored evidence store. |
| `FR-WV-003` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall store app-specific indexes, caches, and metadata separately from authored evidence files. |
| `FR-WV-004` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall detect file additions, deletions, renames, and edits made outside the app. |
| `FR-WV-005` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall maintain internal stable identifiers independent of file path changes. |
| `FR-WV-006` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support multiple root folders or mounted collections inside one workspace. |
| `FR-WV-007` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support encrypted app secrets and provider credentials. |
| `FR-WV-008` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support deep-link protocol actions using `thoughtforge://` URIs for opening vaults, notes, and agent-safe actions. |
| `FR-WV-009` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should restore the previous workspace session including active vault, open tabs, and layout state on startup. |
| `FR-CI-001` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall support instant creation of a new note from keyboard-driven flows. |
| `FR-CI-002` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall support append flows to inbox notes, daily notes, and selected notes. |
| `FR-CI-003` | `Must` | M1 - Vault and Capture Foundation | `todo` | The system shall support drag-and-drop or picker-based attachment import. |
| `FR-CI-004` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support clipboard web clipping with source URL and capture timestamp. |
| `FR-CI-005` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support voice memo or speech-to-note capture through pluggable transcription providers. |
| `FR-CI-006` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support ingestion pipelines for PDFs, web pages, code files, transcripts, and meeting recordings. |
| `FR-CI-007` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should support configurable daily-note capture and append flows. |
| `FR-ED-001` | `Must` | M1 - Vault and Capture Foundation | `todo` | The system shall provide a rich Markdown-native editor. |
| `FR-ED-002` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall support wikilinks and automatic backlink tracking. |
| `FR-ED-003` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall support tags, frontmatter, and inline metadata fields. |
| `FR-ED-004` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall support block references and embeds. |
| `FR-ED-005` | `Must` | M1 - Vault and Capture Foundation | `todo` | The system shall support undo, redo, autosave, and crash-safe recovery. |
| `FR-ED-006` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should support slash commands and command palette insertion flows. |
| `FR-ED-007` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should support split panes, tabs, and pinned views. |
| `FR-ED-008` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support custom typed blocks such as callouts, evidence excerpts, tasks, decisions, commitments, and constraints. |
| `FR-ED-009` | `Could` | M1 - Vault and Capture Foundation | `todo` | The system could support WYSIWYG and source modes with shared document state. |
| `FR-ED-010` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support visual workspace documents stored in an open, serializable format. |
| `FR-ED-011` | `Should` | M1 - Vault and Capture Foundation | `todo` | The system should support schema-validated native artifact generation for supported workspace formats. |
| `FR-ED-012` | `Must` | M1 - Vault and Capture Foundation | `done` | The system shall provide a global command palette with stable command identifiers for workspace and agent actions. |
| `FR-ED-013` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should provide a quick switcher for low-latency note and object navigation. |
| `FR-ED-014` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should provide a persistent workspace layout manager supporting tabs, pinning, and split panes. |
| `FR-ED-015` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should provide an always-visible status bar exposing active vault, active mode, and runtime execution state. |
| `FR-ED-016` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should support per-command keybinding customization with durable persistence. |
| `FR-ED-017` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should provide dedicated outgoing-links and backlinks inspector panels for the active note or object. |
| `FR-ED-018` | `Should` | M1 - Vault and Capture Foundation | `done` | The system should support recent-files and navigation-history jumps in the workspace. |
| `FR-CX-001` | `Must` | M2 - Context and Memory Model | `todo` | The system shall support first-class context objects for `Intent`, `Project`, `Task`, `Decision`, `Commitment`, `Assumption`, `OpenQuestion`, `Entity`, `Resource`, `Constraint`, `Conversation`, `Delegation`, `Approval`, and `StateDelta`. |
| `FR-CX-002` | `Must` | M2 - Context and Memory Model | `todo` | The system shall assign stable internal identifiers to all context objects. |
| `FR-CX-003` | `Must` | M2 - Context and Memory Model | `todo` | The system shall support explicit relationships between context objects and evidence items. |
| `FR-CX-004` | `Must` | M2 - Context and Memory Model | `todo` | The system shall support a working set that represents the user’s currently active focus. |
| `FR-CX-005` | `Must` | M2 - Context and Memory Model | `todo` | The system shall support decision records with rationale, alternatives, status, and supporting evidence. |
| `FR-CX-006` | `Must` | M2 - Context and Memory Model | `todo` | The system shall support commitment records with status, owner, due context, and supporting evidence. |
| `FR-CX-007` | `Should` | M2 - Context and Memory Model | `todo` | The system should support explicit constraints and "do not break" rules linked to goals, projects, or delegations. |
| `FR-CX-008` | `Should` | M2 - Context and Memory Model | `todo` | The system should support open questions and assumptions as first-class unresolved state. |
| `FR-CX-009` | `Should` | M2 - Context and Memory Model | `todo` | The system should support promoting freeform notes or blocks into typed context objects. |
| `FR-CX-010` | `Should` | M2 - Context and Memory Model | `todo` | The system should support progressive formalization from raw evidence into typed context objects, with confidence, review state, and preserved source linkage. |
| `FR-CX-011` | `Should` | M2 - Context and Memory Model | `todo` | The system should support canonical project operating dossiers that summarize goals, current state, key decisions, constraints, open questions, blockers, and next actions for a project. |
| `FR-LM-001` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain a self model containing user preferences, communication style, working style, and risk tolerance. |
| `FR-LM-002` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain a world model containing people, projects, systems, resources, and dependencies relevant to the user. |
| `FR-LM-003` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain a temporal model containing deadlines, rhythms, validity windows, and review cycles. |
| `FR-LM-004` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain an attention model containing focus, deferrals, interruptions, blocking conditions, and noise state. |
| `FR-LM-005` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain an execution model containing permissions, automation rules, delegation boundaries, and fallback policies. |
| `FR-LM-006` | `Should` | M2 - Context and Memory Model | `todo` | The system should distinguish between user-authored truth, imported external truth, inferred context, and temporary agent state. |
| `FR-ML-001` | `Must` | M2 - Context and Memory Model | `todo` | The system shall maintain distinct memory layers for scratch, session, project, personal, and canonical memory. |
| `FR-ML-002` | `Must` | M2 - Context and Memory Model | `todo` | The system shall require explicit promotion rules for moving information from scratch or session memory into project, personal, or canonical memory. |
| `FR-ML-003` | `Must` | M2 - Context and Memory Model | `todo` | The system shall store both recorded time and effective time for important context state. |
| `FR-ML-004` | `Should` | M2 - Context and Memory Model | `todo` | The system should support conflict detection across memory layers. |
| `FR-CD-001` | `Must` | M3 - Daemon and Context Compiler | `todo` | The system shall include a context daemon that observes workspace changes continuously. |
| `FR-CD-002` | `Must` | M3 - Daemon and Context Compiler | `todo` | The context daemon shall reconcile selected external connector events into the workspace model. |
| `FR-CD-003` | `Must` | M3 - Daemon and Context Compiler | `todo` | The context daemon shall emit state deltas when commitments, decisions, plans, or external reality change in materially relevant ways. |
| `FR-CD-004` | `Should` | M3 - Daemon and Context Compiler | `todo` | The context daemon should detect drift between stated plans and observed reality. |
| `FR-CD-005` | `Should` | M3 - Daemon and Context Compiler | `todo` | The context daemon should prepare candidate context bundles for likely next actions. |
| `FR-CD-006` | `Should` | M3 - Daemon and Context Compiler | `done` | The context daemon should detect workspace decay signals such as inbox accumulation, orphaned evidence, broken links, duplicate candidates, stale commitments, and outdated working sets. |
| `FR-CD-007` | `Should` | M3 - Daemon and Context Compiler | `todo` | The context daemon should support recurring maintenance workflows such as inbox cleanup, stale-item review, working set refresh, graph repair, and metadata backfill. |
| `FR-CD-008` | `Should` | M3 - Daemon and Context Compiler | `todo` | The context daemon should detect when a project operating dossier or resume bundle is stale relative to recent evidence, decisions, tasks, or external changes. |
| `FR-CC-001` | `Must` | M3 - Daemon and Context Compiler | `done` | The system shall compile task-specific context bundles for agent work. |
| `FR-CC-002` | `Must` | M3 - Daemon and Context Compiler | `todo` | The system shall explain why each item was included in a compiled context bundle. |
| `FR-CC-003` | `Must` | M3 - Daemon and Context Compiler | `todo` | The system shall track freshness, confidence, and authority for facts or context items used by agents. |
| `FR-CC-004` | `Must` | M3 - Daemon and Context Compiler | `todo` | The system shall detect missing or conflicting context before an agent acts. |
| `FR-CC-005` | `Should` | M3 - Daemon and Context Compiler | `todo` | The system should consider policy state and delegation boundaries during bundle assembly. |
| `FR-CC-006` | `Should` | M3 - Daemon and Context Compiler | `done` | The system should support project resume bundles that rehydrate an agent with the current goal, state, architecture, decisions, blockers, constraints, and next actions of a project. |
| `FR-CC-007` | `Should` | M3 - Daemon and Context Compiler | `todo` | The system should support handoff bundles for transferring project context between users, sessions, or agents. |
| `FR-SR-001` | `Must` | M4 - Retrieval and Knowledge Graph | `todo` | The system shall support full-text search across evidence titles, bodies, tags, and metadata. |
| `FR-SR-002` | `Must` | M4 - Retrieval and Knowledge Graph | `todo` | The system shall support phrase, prefix, boolean, and scoped search. |
| `FR-SR-003` | `Must` | M4 - Retrieval and Knowledge Graph | `done` | The system shall support linked-context navigation. |
| `FR-SR-004` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support semantic search over indexed chunks. |
| `FR-SR-005` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support saved searches, smart collections, and dynamic views. |
| `FR-SR-006` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support resurfacing features such as related notes, stale commitments, decision follow-ups, and today in memory. |
| `FR-SR-007` | `Could` | M4 - Retrieval and Knowledge Graph | `todo` | The system could support timeline and event-centric retrieval. |
| `FR-SR-008` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support structured view definitions for filters, grouping, formulas, and dashboards over evidence and context objects. |
| `FR-SR-009` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should surface maintenance-oriented queues and views for stale, uncategorized, orphaned, duplicate, or review-needed workspace state. |
| `FR-SR-010` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support project startup and operating templates that create recommended views, dossiers, and object scaffolds for common workflows. |
| `FR-SR-011` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support interactive global and local graph views for notes, objects, and relationships. |
| `FR-KG-001` | `Must` | M4 - Retrieval and Knowledge Graph | `todo` | The system shall construct a graph from wikilinks, embeds, tags, references, and typed object relationships. |
| `FR-KG-002` | `Must` | M4 - Retrieval and Knowledge Graph | `todo` | The system shall maintain extracted entities, aliases, and relationships as a projection layer. |
| `FR-KG-003` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support user-defined entity types such as person, project, idea, task, system, and goal. |
| `FR-KG-004` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support graph-based navigation and neighborhood exploration. |
| `FR-KG-005` | `Should` | M4 - Retrieval and Knowledge Graph | `todo` | The system should support provenance for extracted facts. |
| `FR-KG-006` | `Could` | M4 - Retrieval and Knowledge Graph | `todo` | The system could support confidence-weighted graph edges and agent-suggested merges. |
| `FR-AG-001` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall expose workspace context to internal agents through typed retrieval and tool layers. |
| `FR-AG-002` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall allow agents to propose edits before applying them. |
| `FR-AG-003` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall record provenance for agent-generated outputs. |
| `FR-AG-004` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall support permission scopes for agent actions such as read, write, rename, create, execute, memory promotion, and delegation escalation. |
| `FR-AG-005` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall support a non-chat interaction model where the user can invoke agents from notes, selections, tasks, decisions, projects, intents, or working set views. |
| `FR-AG-006` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall present the context bundle used by an agent invocation. |
| `FR-AG-007` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support a shared blackboard for agent or subtask coordination. |
| `FR-AG-008` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support MCP host and client capabilities for tool and context interoperability. |
| `FR-AG-009` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support local model execution and remote provider execution behind one abstraction. |
| `FR-AG-010` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support background agent jobs such as summarization, extraction, plan generation, stale-context detection, and bundle precomputation. |
| `FR-AG-011` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall validate agent-generated native artifacts against format schemas before applying them. |
| `FR-AG-012` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support workspace stewardship workflows through typed agent actions such as clean inbox, repair links, merge duplicates, restructure project areas, archive stale material, and backfill metadata. |
| `FR-AG-013` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support supervised bulk refactors over notes, objects, relationships, metadata, and views with previews, validation, and rollback guidance. |
| `FR-AG-014` | `Should` | M5 - Agent Runtime and Delegation | `done` | The system should support explicit resume-project and handoff-project agent actions that operate on project dossiers and compiled bundles rather than ad hoc chat history. |
| `FR-DP-001` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall support a delegation ladder from suggest-only to bounded autonomous execution. |
| `FR-DP-002` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall support explicit approval objects and approval requests. |
| `FR-DP-003` | `Must` | M5 - Agent Runtime and Delegation | `todo` | The system shall support policy rules that constrain agent actions by scope, context, object type, or external tool. |
| `FR-DP-004` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should simulate risky or multi-step plans before execution. |
| `FR-DP-005` | `Should` | M5 - Agent Runtime and Delegation | `todo` | The system should support rollback guidance or reversible execution where technically feasible. |
| `FR-EG-001` | `Must` | M6 - External Grounding | `todo` | The system shall support connector-based ingestion or mirroring of external systems as resources. |
| `FR-EG-002` | `Should` | M6 - External Grounding | `todo` | The system should support calendar grounding for meetings, deadlines, and scheduled work. |
| `FR-EG-003` | `Should` | M6 - External Grounding | `todo` | The system should support git and GitHub grounding for code work. |
| `FR-EG-004` | `Should` | M6 - External Grounding | `todo` | The system should support browser research and transcript grounding. |
| `FR-EG-005` | `Should` | M6 - External Grounding | `todo` | The system should support freshness tracking for external resources. |
| `FR-SC-001` | `Must` | M7 - Sync and Collaboration | `todo` | The system shall remain fully usable offline. |
| `FR-SC-002` | `Must` | M7 - Sync and Collaboration | `todo` | The system shall handle concurrent changes from multiple processes without silent data loss. |
| `FR-SC-003` | `Should` | M7 - Sync and Collaboration | `todo` | The system should support CRDT-backed collaboration for selected notes or workspaces. |
| `FR-SC-004` | `Should` | M7 - Sync and Collaboration | `todo` | The system should support sync adapters rather than a hard-coded sync backend. |
| `FR-SC-005` | `Could` | M7 - Sync and Collaboration | `todo` | The system could support presence, cursors, and shared sessions. |
| `FR-IE-001` | `Must` | M8 - Interop and CLI | `todo` | The system shall import existing Markdown vaults with minimal restructuring. |
| `FR-IE-002` | `Must` | M8 - Interop and CLI | `todo` | The system shall export authored evidence and attachments without vendor lock-in. |
| `FR-IE-003` | `Should` | M8 - Interop and CLI | `todo` | The system should import metadata from common PKM formats such as frontmatter and task syntaxes. |
| `FR-IE-004` | `Should` | M8 - Interop and CLI | `todo` | The system should expose an extension API and internal command surface for plugins. |
| `FR-IE-005` | `Should` | M8 - Interop and CLI | `todo` | The system should support open-in-default-app and open-with-external-editor flows. |
| `FR-IE-006` | `Should` | M8 - Interop and CLI | `todo` | The system should support import and export of open visual workspace artifacts and structured view definitions. |
| `FR-IE-007` | `Must` | M8 - Interop and CLI | `done` | The system shall expose a deterministic command-line interface for core workspace automation. |
| `FR-IE-008` | `Should` | M8 - Interop and CLI | `done` | The system should provide a core-plugin host with lifecycle hooks and bounded capability scopes. |
| `FR-IE-009` | `Should` | M8 - Interop and CLI | `done` | The system should allow plugins to register command IDs into the global command bus. |
| `FR-IE-010` | `Should` | M8 - Interop and CLI | `todo` | The system should support user-controlled theme packages and CSS snippet overlays in workspace configuration. |
| `FR-IE-011` | `Should` | M8 - Interop and CLI | `todo` | The system should support startup safe mode that loads only core plugins and disables third-party extensions. |
| `FR-SP-001` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall require explicit user approval for destructive or external side-effecting agent actions. |
| `FR-SP-002` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall separate trusted core code from less-trusted frontend and plugin execution contexts. |
| `FR-SP-003` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall support provider-level data sharing controls. |
| `FR-SP-004` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall allow users to inspect which evidence, passages, objects, models, or resources were exposed to a model call. |
| `FR-SP-005` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall apply explicit approval rules for promotion into durable memory layers. |
| `FR-SP-006` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall expose what the context daemon observes and allow per-source controls. |
| `FR-SP-007` | `Should` | M9 - Trust, Safety, and Evaluation | `todo` | The system should support redaction rules and no-send folders. |
| `FR-SP-008` | `Should` | M9 - Trust, Safety, and Evaluation | `todo` | The system should support encrypted local secret storage. |
| `FR-SP-009` | `Should` | M9 - Trust, Safety, and Evaluation | `todo` | The system should verify signed release artifacts and update payload integrity before applying updates. |
| `FR-OE-001` | `Must` | M9 - Trust, Safety, and Evaluation | `todo` | The system shall log user-visible agent actions, approvals, denials, memory promotions, daemon reconciliations, and failures. |
| `FR-OE-002` | `Should` | M9 - Trust, Safety, and Evaluation | `todo` | The system should support local evaluation harnesses for retrieval quality, context compilation quality, delegation safety, and task completion quality. |
| `FR-OE-003` | `Should` | M9 - Trust, Safety, and Evaluation | `todo` | The system should support optional anonymous telemetry with explicit opt-in. |
| `NFR-001` | `Quality` | QG - Quality Gates | `todo` | Performance: The app shall open an existing medium-sized vault in under 3 seconds on a modern laptop after initial indexing. |
| `NFR-002` | `Quality` | QG - Quality Gates | `todo` | Search latency: Lexical search shall return initial results in under 150 ms for the 95th percentile on a vault with 100,000 evidence items or chunks. |
| `NFR-003` | `Quality` | QG - Quality Gates | `todo` | Context compilation latency: A standard context bundle shall compile in under 500 ms for the 95th percentile before model invocation. |
| `NFR-004` | `Quality` | QG - Quality Gates | `todo` | Daemon reconciliation latency: An ordinary local change shall be reflected in the live model within 1 second for the 95th percentile. |
| `NFR-005` | `Quality` | QG - Quality Gates | `todo` | Save latency: Ordinary typing shall feel real-time with autosave that does not visibly block the editor. |
| `NFR-006` | `Quality` | QG - Quality Gates | `todo` | Offline availability: Core evidence authoring, object editing, live-model editing, and retrieval shall work without network access. |
| `NFR-007` | `Quality` | QG - Quality Gates | `todo` | Reliability: The system shall protect against corruption during crashes through journaling, transactional metadata updates, and recovery flows. |
| `NFR-008` | `Quality` | QG - Quality Gates | `todo` | Portability: Authored evidence shall remain usable in plain Markdown-oriented tools. |
| `NFR-009` | `Quality` | QG - Quality Gates | `todo` | Extensibility: Core features shall expose stable internal interfaces so that plugin support can be added without major rewrites. |
| `NFR-010` | `Quality` | QG - Quality Gates | `todo` | Accessibility: Desktop UX shall target WCAG 2.2 AA where applicable, including keyboard navigation, screen-reader-readable controls, and contrast compliance. |
| `NFR-011` | `Quality` | QG - Quality Gates | `todo` | Security: Sensitive actions shall cross explicit trust boundaries and permission checks. |
| `NFR-012` | `Quality` | QG - Quality Gates | `todo` | Privacy: The user shall be able to run the product without any cloud account. |
| `NFR-013` | `Quality` | QG - Quality Gates | `done` | Observability: Errors shall be capturable through local logs and structured diagnostics. |
| `NFR-014` | `Quality` | QG - Quality Gates | `todo` | Provenance quality: Agent-visible outputs shall retain source references and context bundle identifiers. |
| `NFR-015` | `Quality` | QG - Quality Gates | `todo` | Cross-platform support: The architecture shall support macOS, Windows, and Linux even if release sequencing starts with macOS. |
| `NFR-016` | `Quality` | QG - Quality Gates | `todo` | Artifact validity: Supported native artifact formats shall be schema-validated before durable writes are committed. |
| `NFR-017` | `Quality` | QG - Quality Gates | `todo` | Maintenance safety: Automated stewardship and bulk refactors shall default to previewable, bounded, and reversible behavior where technically feasible. |
| `NFR-018` | `Quality` | QG - Quality Gates | `todo` | Command latency: Command palette open and command dispatch feedback shall occur in under 100 ms for the 95th percentile on a warmed desktop session. |
