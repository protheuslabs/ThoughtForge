# Software Requirements Specification

## 1. Document Control

- Product: Thoughtforge
- Document type: Software Requirements Specification
- Version: 0.4
- Date: 2026-03-17
- Status: Draft for product-definition phase

## 2. Purpose

Thoughtforge is a local-first desktop application that acts as a cognitive control plane for humans and agents. It must let users capture evidence, structure intent, track decisions and commitments, manage live focus, understand change over time, and safely collaborate with agents in a way that is at least as capable as Obsidian for core note workflows while being materially better for agent understanding, delegation, and execution.

## 3. Scope

The product includes:

- personal knowledge management and authored evidence capture
- Markdown-native note authoring and organization
- first-class context objects for intent, work, decisions, commitments, and constraints
- self, world, temporal, attention, and execution models
- working sets and layered memory
- a context daemon for continuous state reconciliation
- knowledge graph and structured context extraction
- context compilation for agent tasks
- policy, delegation, approval, and simulation flows
- agent-readable context and tool surfaces
- open visual workspace artifacts and structured view definitions
- deterministic command-line automation
- workspace stewardship, repair, and decay-prevention workflows
- progressive formalization from raw evidence into typed context
- search, retrieval, resurfacing, and summarization
- external grounding via connected systems
- import/export and migration paths
- local-first operation with optional sync and optional remote model use

The product does not initially include:

- mandatory cloud storage
- always-on remote backends
- social publishing features
- marketplace-scale third-party plugin distribution at launch

## 4. Goals

### 4.1 Product Goals

- match or exceed Obsidian on core single-user knowledge-work workflows
- make the workspace a better interface to an agentic system than chat alone
- preserve user ownership of data and portability of authored evidence
- model active state, not just documents
- reduce the need for users to restate context across sessions
- support fast thought capture and high-fidelity retrieval
- prevent workspace decay and abandonment through supervised maintenance
- build trust through permissions, provenance, freshness, authority, and reversibility

### 4.2 Non-Goals for MVP

- full multi-user collaboration suite
- mobile-first experience
- enterprise admin console
- cloud-only AI features
- public sharing platform

## 5. Stakeholders and Personas

### 5.1 Primary Stakeholders

- founder or product owner
- end users building personal or professional second-brain systems
- developers building agent capabilities and extensions

### 5.2 Primary Personas

- research-heavy operator: needs capture, synthesis, resurfacing, and planning across many sources
- builder with an agentic workflow: wants the agent to understand project context, decisions, tasks, code notes, and constraints
- knowledge worker with long-lived notes: cares about ownership, portability, and link-based thinking
- power user migrating from Obsidian: expects familiar vault concepts, fast keyboard flows, and extensibility

## 6. Product Principles

- local-first by default
- user-owned data
- notes are evidence, not the only primitive
- context objects are first-class
- live state matters more than static documents
- separate authored truth from derived inference
- maintenance is a product capability, not user housekeeping
- progressive formalization beats forced upfront structure
- freshness, authority, provenance, and approval are explicit
- security and policy before autonomy
- fast enough to feel invisible

## 7. Assumptions and Dependencies

- users will primarily run the app on desktop operating systems
- canonical authored evidence should remain readable outside the app
- some users will use only local models while others will use hosted models
- the system must tolerate external file edits and external sync tools
- optional sync and collaboration will be layered on top of a strong offline core
- external grounding will be incremental and connector-based

## 8. System Overview

Thoughtforge manages one or more local vaults containing Markdown notes, attachments, and app metadata. The application parses those assets into authored evidence, maintains first-class context objects such as intents, projects, decisions, commitments, tasks, resources, constraints, and conversations, and stores live models of self, world, time, attention, and execution policy.

A context daemon continuously observes local events and selected external systems, reconciles new information into the workspace model, and emits state deltas when plans, commitments, or reality shift.

Agents do not operate on raw files directly. They consume task-specific context bundles produced by a context compiler, cite provenance, respect freshness and authority markers, comply with delegation policies, and perform approved actions through a permissioned command layer.

The system also acts as a workspace steward. It should detect decay such as inbox buildup, stale commitments, orphaned evidence, broken links, duplicate candidates, and under-structured captures, then propose or execute approved maintenance workflows that keep the workspace useful over time.

## 9. Functional Requirements

### 9.1 Workspace and Vault Management

- FR-WV-001 (Must): The system shall allow the user to create, open, close, and switch between vaults.
  Acceptance: A user can select a local folder as a vault and reopen it later without data loss.

- FR-WV-002 (Must): The system shall treat Markdown files and asset folders as the primary user-owned authored evidence store.
  Acceptance: Evidence remains readable and editable outside the app.

- FR-WV-003 (Must): The system shall store app-specific indexes, caches, and metadata separately from authored evidence files.
  Acceptance: Deleting app metadata does not delete evidence files.

- FR-WV-004 (Must): The system shall detect file additions, deletions, renames, and edits made outside the app.
  Acceptance: External edits appear in the UI without manual re-import.

- FR-WV-005 (Must): The system shall maintain internal stable identifiers independent of file path changes.
  Acceptance: Renaming a note preserves backlinks, objects, commitments, and references.

- FR-WV-006 (Should): The system should support multiple root folders or mounted collections inside one workspace.
  Acceptance: A workspace may include configured subroots without flattening the file system.

- FR-WV-007 (Should): The system should support encrypted app secrets and provider credentials.
  Acceptance: API keys are stored outside evidence files and can be revoked.

- FR-WV-008 (Should): The system should support deep-link protocol actions using `thoughtforge://` URIs for opening vaults, notes, and agent-safe actions.
  Acceptance: A protocol link can open a specific note or launch a scoped workspace action without requiring chat mediation.

- FR-WV-009 (Should): The system should restore the previous workspace session including active vault, open tabs, and layout state on startup.
  Acceptance: Restarting the app can reopen the prior session context without manual reconstruction.

- FR-WV-010 (Must): The desktop runtime shall support opening and switching local vaults through a native command bridge.
  Acceptance: A user can open a vault path, register it, and switch active vaults without restarting the app.

- FR-WV-011 (Must): The desktop runtime shall persist note creation, note edits, and capture appends directly to vault files.
  Acceptance: Editing or capturing in the desktop UI writes durable changes to the corresponding Markdown files on disk.

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

- FR-CI-006 (Should): The system should support ingestion pipelines for PDFs, web pages, code files, transcripts, and meeting recordings.
  Acceptance: Imported sources produce evidence plus extracted metadata.

- FR-CI-007 (Should): The system should support configurable daily-note capture and append flows.
  Acceptance: A daily note target can be opened or appended from one keyboard-first command.

### 9.3 Editor and Evidence Authoring

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

- FR-ED-008 (Should): The system should support custom typed blocks such as callouts, evidence excerpts, tasks, decisions, commitments, and constraints.
  Acceptance: Typed blocks render consistently and remain serializable.

- FR-ED-009 (Could): The system could support WYSIWYG and source modes with shared document state.
  Acceptance: Users can toggle views without content corruption.

- FR-ED-010 (Should): The system should support visual workspace documents stored in an open, serializable format.
  Acceptance: A visual workspace can be created, edited, versioned, and inspected outside the app.

- FR-ED-011 (Should): The system should support schema-validated native artifact generation for supported workspace formats.
  Acceptance: An invalid generated artifact is blocked or repaired before durable write.

- FR-ED-012 (Must): The system shall provide a global command palette with stable command identifiers for workspace and agent actions.
  Acceptance: Users can execute supported actions from a keyboard-driven command palette that exposes command IDs, labels, and keybindings.

- FR-ED-013 (Should): The system should provide a quick switcher for low-latency note and object navigation.
  Acceptance: Users can fuzzy-search and open a note or object from one keyboard-first interaction.

- FR-ED-014 (Should): The system should provide a persistent workspace layout manager supporting tabs, pinning, and split panes.
  Acceptance: Open tabs, pin state, and split state can be restored after restart.

- FR-ED-015 (Should): The system should provide an always-visible status bar exposing active vault, active mode, and runtime execution state.
  Acceptance: The status bar can show active context at all times and update after commands or mode changes.

- FR-ED-016 (Should): The system should support per-command keybinding customization with durable persistence.
  Acceptance: A user can update a command hotkey and keep it across restarts.

- FR-ED-017 (Should): The system should provide dedicated outgoing-links and backlinks inspector panels for the active note or object.
  Acceptance: Linked-context relationships are inspectable without leaving the active workspace view.

- FR-ED-018 (Should): The system should support recent-files and navigation-history jumps in the workspace.
  Acceptance: A user can quickly return to recently opened files or step through note navigation history.

### 9.4 Context Objects and Relationships

- FR-CX-001 (Must): The system shall support first-class context objects for `Intent`, `Project`, `Task`, `Decision`, `Commitment`, `Assumption`, `OpenQuestion`, `Entity`, `Resource`, `Constraint`, `Conversation`, `Delegation`, `Approval`, and `StateDelta`.
  Acceptance: Each object type can be created, read, updated, linked, and surfaced in dedicated views.

- FR-CX-002 (Must): The system shall assign stable internal identifiers to all context objects.
  Acceptance: Renaming, moving, or retitling an object does not break references.

- FR-CX-003 (Must): The system shall support explicit relationships between context objects and evidence items.
  Acceptance: A decision can cite source notes, a commitment can depend on a constraint, and a task can belong to a project.

- FR-CX-004 (Must): The system shall support a working set that represents the user’s currently active focus.
  Acceptance: A user can view what is active, blocked, stale, noisy, and awaiting review.

- FR-CX-005 (Must): The system shall support decision records with rationale, alternatives, status, and supporting evidence.
  Acceptance: A decision object exposes what was decided, why, and from which sources.

- FR-CX-006 (Must): The system shall support commitment records with status, owner, due context, and supporting evidence.
  Acceptance: A commitment can be linked to projects, tasks, or external resources and tracked over time.

- FR-CX-007 (Should): The system should support explicit constraints and "do not break" rules linked to goals, projects, or delegations.
  Acceptance: Constraints can be retrieved and shown to the user and agent during execution.

- FR-CX-008 (Should): The system should support open questions and assumptions as first-class unresolved state.
  Acceptance: The system can surface unresolved questions or risky assumptions during planning or execution.

- FR-CX-009 (Should): The system should support promoting freeform notes or blocks into typed context objects.
  Acceptance: A user or agent can convert a block into a decision, commitment, or resource without losing provenance.

- FR-CX-010 (Should): The system should support progressive formalization from raw evidence into typed context objects, with confidence, review state, and preserved source linkage.
  Acceptance: The system can propose candidate tasks, decisions, commitments, constraints, or resources from raw captures without silently promoting them into canonical truth.

- FR-CX-011 (Should): The system should support canonical project operating dossiers that summarize goals, current state, key decisions, constraints, open questions, blockers, and next actions for a project.
  Acceptance: A project can expose a durable machine-readable summary that can be inspected, edited, cited, and refreshed over time.

### 9.5 Live Models

- FR-LM-001 (Must): The system shall maintain a self model containing user preferences, communication style, working style, and risk tolerance.
  Acceptance: The user can inspect and edit core self-model fields.

- FR-LM-002 (Must): The system shall maintain a world model containing people, projects, systems, resources, and dependencies relevant to the user.
  Acceptance: Objects and resources can be linked into a structured world model.

- FR-LM-003 (Must): The system shall maintain a temporal model containing deadlines, rhythms, validity windows, and review cycles.
  Acceptance: A task or commitment can carry both scheduling and validity metadata.

- FR-LM-004 (Must): The system shall maintain an attention model containing focus, deferrals, interruptions, blocking conditions, and noise state.
  Acceptance: The working set view can reflect focus and interruption state.

- FR-LM-005 (Must): The system shall maintain an execution model containing permissions, automation rules, delegation boundaries, and fallback policies.
  Acceptance: Agent actions are evaluated against execution model state.

- FR-LM-006 (Should): The system should distinguish between user-authored truth, imported external truth, inferred context, and temporary agent state.
  Acceptance: Context items can display an authority class.

### 9.6 Memory Layers and Bitemporal State

- FR-ML-001 (Must): The system shall maintain distinct memory layers for scratch, session, project, personal, and canonical memory.
  Acceptance: Data written to one layer can be inspected separately from other layers.

- FR-ML-002 (Must): The system shall require explicit promotion rules for moving information from scratch or session memory into project, personal, or canonical memory.
  Acceptance: Promotion is auditable and can require user approval.

- FR-ML-003 (Must): The system shall store both recorded time and effective time for important context state.
  Acceptance: A commitment or directive can show when it was recorded and when it became true.

- FR-ML-004 (Should): The system should support conflict detection across memory layers.
  Acceptance: A user can inspect conflicting state before promotion.

### 9.7 Context Daemon and State Reconciliation

- FR-CD-001 (Must): The system shall include a context daemon that observes workspace changes continuously.
  Acceptance: Edits to evidence or objects generate reconciliation events without manual refresh.

- FR-CD-002 (Must): The context daemon shall reconcile selected external connector events into the workspace model.
  Acceptance: A relevant external change can become a resource, delta, or candidate update in the workspace.

- FR-CD-003 (Must): The context daemon shall emit state deltas when commitments, decisions, plans, or external reality change in materially relevant ways.
  Acceptance: The user can review what changed and why it matters.

- FR-CD-004 (Should): The context daemon should detect drift between stated plans and observed reality.
  Acceptance: A stale or broken plan can be surfaced proactively.

- FR-CD-005 (Should): The context daemon should prepare candidate context bundles for likely next actions.
  Acceptance: A user can open a task or project and see a precompiled suggested bundle.

- FR-CD-006 (Should): The context daemon should detect workspace decay signals such as inbox accumulation, orphaned evidence, broken links, duplicate candidates, stale commitments, and outdated working sets.
  Acceptance: The user can inspect a maintenance queue explaining what needs attention and why.

- FR-CD-007 (Should): The context daemon should support recurring maintenance workflows such as inbox cleanup, stale-item review, working set refresh, graph repair, and metadata backfill.
  Acceptance: The system can prepare or run approved maintenance jobs and report the resulting state changes.

- FR-CD-008 (Should): The context daemon should detect when a project operating dossier or resume bundle is stale relative to recent evidence, decisions, tasks, or external changes.
  Acceptance: The system can flag a dossier or handoff bundle for refresh when relevant project state changes.

### 9.8 Context Compilation

- FR-CC-001 (Must): The system shall compile task-specific context bundles for agent work.
  Acceptance: A bundle can include goal, evidence, objects, recent decisions, commitments, constraints, working set state, and external resources.

- FR-CC-002 (Must): The system shall explain why each item was included in a compiled context bundle.
  Acceptance: The user can inspect selection rationale after compilation.

- FR-CC-003 (Must): The system shall track freshness, confidence, and authority for facts or context items used by agents.
  Acceptance: A bundle can flag stale, low-confidence, or non-authoritative inputs.

- FR-CC-004 (Must): The system shall detect missing or conflicting context before an agent acts.
  Acceptance: A bundle can identify unresolved conflicts or absent required fields.

- FR-CC-005 (Should): The system should consider policy state and delegation boundaries during bundle assembly.
  Acceptance: A bundle can expose execution limits relevant to the requested action.

- FR-CC-006 (Should): The system should support project resume bundles that rehydrate an agent with the current goal, state, architecture, decisions, blockers, constraints, and next actions of a project.
  Acceptance: A user can trigger a resume flow and receive a project-scoped bundle suitable for bringing a fresh agent session up to speed.

- FR-CC-007 (Should): The system should support handoff bundles for transferring project context between users, sessions, or agents.
  Acceptance: A handoff bundle can summarize what matters now, what changed recently, and what remains unresolved with source linkage.

### 9.9 Search, Retrieval, and Resurfacing

- FR-SR-001 (Must): The system shall support full-text search across evidence titles, bodies, tags, and metadata.
  Acceptance: Queries return ranked results with highlighted matches.

- FR-SR-002 (Must): The system shall support phrase, prefix, boolean, and scoped search.
  Acceptance: Users can search by evidence subset, tag, path, or field.

- FR-SR-003 (Must): The system shall support linked-context navigation.
  Acceptance: Users can inspect incoming and outgoing relationships for notes, objects, and entities.

- FR-SR-004 (Should): The system should support semantic search over indexed chunks.
  Acceptance: A semantic query returns relevant evidence beyond lexical term matches.

- FR-SR-005 (Should): The system should support saved searches, smart collections, and dynamic views.
  Acceptance: A saved query remains live as evidence and objects change.

- FR-SR-006 (Should): The system should support resurfacing features such as related notes, stale commitments, decision follow-ups, and today in memory.
  Acceptance: The app can generate ranked resurfacing panels from workspace state.

- FR-SR-007 (Could): The system could support timeline and event-centric retrieval.
  Acceptance: Time-bounded queries can filter evidence and activities.

- FR-SR-008 (Should): The system should support structured view definitions for filters, grouping, formulas, and dashboards over evidence and context objects.
  Acceptance: A structured view definition remains human-readable, editable, and executable by the app and agents.

- FR-SR-009 (Should): The system should surface maintenance-oriented queues and views for stale, uncategorized, orphaned, duplicate, or review-needed workspace state.
  Acceptance: A user can open a maintenance view and act on ranked cleanup or formalization candidates.

- FR-SR-010 (Should): The system should support project startup and operating templates that create recommended views, dossiers, and object scaffolds for common workflows.
  Acceptance: A user can initialize a project context from a template without forcing a specific folder hierarchy.

- FR-SR-011 (Should): The system should support interactive global and local graph views for notes, objects, and relationships.
  Acceptance: A user can pivot from one node into its local neighborhood and open linked artifacts directly.

### 9.10 Knowledge Graph and Structured Context

- FR-KG-001 (Must): The system shall construct a graph from wikilinks, embeds, tags, references, and typed object relationships.
  Acceptance: Graph relationships update incrementally when evidence or object state changes.

- FR-KG-002 (Must): The system shall maintain extracted entities, aliases, and relationships as a projection layer.
  Acceptance: Entity views show source evidence and confidence.

- FR-KG-003 (Should): The system should support user-defined entity types such as person, project, idea, task, system, and goal.
  Acceptance: New entity schemas can be created without code changes.

- FR-KG-004 (Should): The system should support graph-based navigation and neighborhood exploration.
  Acceptance: Users can expand from a note or object to related entities, objects, and evidence.

- FR-KG-005 (Should): The system should support provenance for extracted facts.
  Acceptance: Every extracted relation links back to one or more source passages.

- FR-KG-006 (Could): The system could support confidence-weighted graph edges and agent-suggested merges.
  Acceptance: Proposed merges require user confirmation before becoming canonical.

### 9.11 Agent Runtime and Tooling

- FR-AG-001 (Must): The system shall expose workspace context to internal agents through typed retrieval and tool layers.
  Acceptance: The agent can read evidence, search, inspect decisions, inspect commitments, inspect constraints, inspect live models, and cite sources.

- FR-AG-002 (Must): The system shall allow agents to propose edits before applying them.
  Acceptance: The user can review a diff or action plan before approval.

- FR-AG-003 (Must): The system shall record provenance for agent-generated outputs.
  Acceptance: Generated content includes source references, context bundle identifiers, and model metadata.

- FR-AG-004 (Must): The system shall support permission scopes for agent actions such as read, write, rename, create, execute, memory promotion, and delegation escalation.
  Acceptance: An action outside the granted scope is blocked.

- FR-AG-005 (Must): The system shall support a non-chat interaction model where the user can invoke agents from notes, selections, tasks, decisions, projects, intents, or working set views.
  Acceptance: Agent actions can originate from workspace context without opening a chat thread.

- FR-AG-006 (Must): The system shall present the context bundle used by an agent invocation.
  Acceptance: The user can inspect what context was provided and why.

- FR-AG-007 (Should): The system should support a shared blackboard for agent or subtask coordination.
  Acceptance: Multiple coordinated operations can share structured intermediate state without relying on chat history.

- FR-AG-008 (Should): The system should support MCP host and client capabilities for tool and context interoperability.
  Acceptance: External agents can connect to workspace resources using MCP-compatible sessions.

- FR-AG-009 (Should): The system should support local model execution and remote provider execution behind one abstraction.
  Acceptance: The user can switch providers without changing higher-level agent workflows.

- FR-AG-010 (Should): The system should support background agent jobs such as summarization, extraction, plan generation, stale-context detection, and bundle precomputation.
  Acceptance: Jobs run asynchronously and report status.

- FR-AG-011 (Must): The system shall validate agent-generated native artifacts against format schemas before applying them.
  Acceptance: Generated Markdown, visual documents, and view definitions are checked before durable write.

- FR-AG-012 (Should): The system should support workspace stewardship workflows through typed agent actions such as clean inbox, repair links, merge duplicates, restructure project areas, archive stale material, and backfill metadata.
  Acceptance: A user can invoke a stewardship workflow from the workspace and review the planned changes before execution.

- FR-AG-013 (Should): The system should support supervised bulk refactors over notes, objects, relationships, metadata, and views with previews, validation, and rollback guidance.
  Acceptance: A bulk restructure produces an inspectable plan and only applies validated changes within approved scope.

- FR-AG-014 (Should): The system should support explicit resume-project and handoff-project agent actions that operate on project dossiers and compiled bundles rather than ad hoc chat history.
  Acceptance: A user can invoke a resume or handoff workflow from a project and inspect the resulting context package before use.

### 9.12 Delegation, Approval, and Simulation

- FR-DP-001 (Must): The system shall support a delegation ladder from suggest-only to bounded autonomous execution.
  Acceptance: Delegation level is visible and adjustable per workflow or agent.

- FR-DP-002 (Must): The system shall support explicit approval objects and approval requests.
  Acceptance: A user can review and approve or deny a requested action or promotion.

- FR-DP-003 (Must): The system shall support policy rules that constrain agent actions by scope, context, object type, or external tool.
  Acceptance: A prohibited action is blocked with an inspectable reason.

- FR-DP-004 (Should): The system should simulate risky or multi-step plans before execution.
  Acceptance: A user can inspect expected changes, affected objects, and external side effects before approval.

- FR-DP-005 (Should): The system should support rollback guidance or reversible execution where technically feasible.
  Acceptance: A user can inspect which actions are reversible before approving execution.

### 9.13 External Grounding and Connectors

- FR-EG-001 (Must): The system shall support connector-based ingestion or mirroring of external systems as resources.
  Acceptance: External items can appear as first-class resources linked to workspace objects.

- FR-EG-002 (Should): The system should support calendar grounding for meetings, deadlines, and scheduled work.
  Acceptance: A calendar event can be linked to tasks, projects, or meeting notes.

- FR-EG-003 (Should): The system should support git and GitHub grounding for code work.
  Acceptance: Commits, branches, pull requests, or issues can be linked to projects or tasks.

- FR-EG-004 (Should): The system should support browser research and transcript grounding.
  Acceptance: Web captures or transcripts can preserve source URL, timestamps, and provenance.

- FR-EG-005 (Should): The system should support freshness tracking for external resources.
  Acceptance: A stale external resource is marked as stale in retrieval or context compilation.

### 9.14 Sync, Collaboration, and Conflict Handling

- FR-SC-001 (Must): The system shall remain fully usable offline.
  Acceptance: Evidence authoring, object editing, search, and local agent flows work without network access.

- FR-SC-002 (Must): The system shall handle concurrent changes from multiple processes without silent data loss.
  Acceptance: Conflicting updates are merged or surfaced explicitly.

- FR-SC-003 (Should): The system should support CRDT-backed collaboration for selected notes or workspaces.
  Acceptance: Two clients editing the same note eventually converge.

- FR-SC-004 (Should): The system should support sync adapters rather than a hard-coded sync backend.
  Acceptance: Different sync implementations can be swapped behind a shared interface.

- FR-SC-005 (Could): The system could support presence, cursors, and shared sessions.
  Acceptance: Live co-editing state is visible in collaborative mode.

### 9.15 Import, Export, and Interoperability

- FR-IE-001 (Must): The system shall import existing Markdown vaults with minimal restructuring.
  Acceptance: Obsidian-style vaults open with working links and attachments.

- FR-IE-002 (Must): The system shall export authored evidence and attachments without vendor lock-in.
  Acceptance: A user can leave the product with human-readable files intact.

- FR-IE-003 (Should): The system should import metadata from common PKM formats such as frontmatter and task syntaxes.
  Acceptance: Recognized fields are preserved during import.

- FR-IE-004 (Should): The system should expose an extension API and internal command surface for plugins.
  Acceptance: Plugins can register commands, views, and background jobs.

- FR-IE-005 (Should): The system should support open-in-default-app and open-with-external-editor flows.
  Acceptance: The user can edit evidence externally and return without desync.

- FR-IE-006 (Should): The system should support import and export of open visual workspace artifacts and structured view definitions.
  Acceptance: Visual documents and view specifications can be moved without vendor-locked binary conversion.

- FR-IE-007 (Must): The system shall expose a deterministic command-line interface for core workspace automation.
  Acceptance: Notes, objects, views, and agent-safe operations can be created or queried through CLI commands with stable outputs.

- FR-IE-008 (Should): The system should provide a core-plugin host with lifecycle hooks and bounded capability scopes.
  Acceptance: Built-in modules can register startup, shutdown, command, and view hooks through a stable internal contract.

- FR-IE-009 (Should): The system should allow plugins to register command IDs into the global command bus.
  Acceptance: Plugin-registered commands are discoverable in the command palette and enforce declared scope boundaries.

- FR-IE-010 (Should): The system should support user-controlled theme packages and CSS snippet overlays in workspace configuration.
  Acceptance: A user can enable or disable theme/snippet overrides without modifying canonical evidence files.

- FR-IE-011 (Should): The system should support startup safe mode that loads only core plugins and disables third-party extensions.
  Acceptance: A user can relaunch in safe mode to recover from plugin-caused instability.

- FR-IE-012 (Should): The desktop app should expose typed invoke commands for bootstrap, vault lifecycle, note lifecycle, and capture flows.
  Acceptance: The desktop UI can call stable runtime commands to load workspace state and execute file-safe operations.

### 9.16 Security, Permissions, and Privacy

- FR-SP-001 (Must): The system shall require explicit user approval for destructive or external side-effecting agent actions.
  Acceptance: An agent cannot delete evidence or execute external tools without approval.

- FR-SP-002 (Must): The system shall separate trusted core code from less-trusted frontend and plugin execution contexts.
  Acceptance: Sensitive operations are mediated through permissioned commands.

- FR-SP-003 (Must): The system shall support provider-level data sharing controls.
  Acceptance: Users can disable sending workspace content to remote models by policy or workspace setting.

- FR-SP-004 (Must): The system shall allow users to inspect which evidence, passages, objects, models, or resources were exposed to a model call.
  Acceptance: Retrieval context for a request is visible after the action completes.

- FR-SP-005 (Must): The system shall apply explicit approval rules for promotion into durable memory layers.
  Acceptance: Promotion events are gated and auditable.

- FR-SP-006 (Must): The system shall expose what the context daemon observes and allow per-source controls.
  Acceptance: A user can enable, disable, or inspect observed sources.

- FR-SP-007 (Should): The system should support redaction rules and no-send folders.
  Acceptance: Marked content is excluded from remote inference requests.

- FR-SP-008 (Should): The system should support encrypted local secret storage.
  Acceptance: Credentials are stored outside plain-text evidence files.

- FR-SP-009 (Should): The system should verify signed release artifacts and update payload integrity before applying updates.
  Acceptance: The updater refuses unsigned or hash-mismatched payloads and records a diagnostic event.

### 9.17 Observability and Evaluation

- FR-OE-001 (Must): The system shall log user-visible agent actions, approvals, denials, memory promotions, daemon reconciliations, and failures.
  Acceptance: A user can audit what the agent or daemon attempted and what changed.

- FR-OE-002 (Should): The system should support local evaluation harnesses for retrieval quality, context compilation quality, delegation safety, and task completion quality.
  Acceptance: Sample benchmarks can be run against a test vault.

- FR-OE-003 (Should): The system should support optional anonymous telemetry with explicit opt-in.
  Acceptance: Telemetry is off by default in early releases.

## 10. Non-Functional Requirements

- NFR-001 Performance: The app shall open an existing medium-sized vault in under 3 seconds on a modern laptop after initial indexing.
- NFR-002 Search latency: Lexical search shall return initial results in under 150 ms for the 95th percentile on a vault with 100,000 evidence items or chunks.
- NFR-003 Context compilation latency: A standard context bundle shall compile in under 500 ms for the 95th percentile before model invocation.
- NFR-004 Daemon reconciliation latency: An ordinary local change shall be reflected in the live model within 1 second for the 95th percentile.
- NFR-005 Save latency: Ordinary typing shall feel real-time with autosave that does not visibly block the editor.
- NFR-006 Offline availability: Core evidence authoring, object editing, live-model editing, and retrieval shall work without network access.
- NFR-007 Reliability: The system shall protect against corruption during crashes through journaling, transactional metadata updates, and recovery flows.
- NFR-008 Portability: Authored evidence shall remain usable in plain Markdown-oriented tools.
- NFR-009 Extensibility: Core features shall expose stable internal interfaces so that plugin support can be added without major rewrites.
- NFR-010 Accessibility: Desktop UX shall target WCAG 2.2 AA where applicable, including keyboard navigation, screen-reader-readable controls, and contrast compliance.
- NFR-011 Security: Sensitive actions shall cross explicit trust boundaries and permission checks.
- NFR-012 Privacy: The user shall be able to run the product without any cloud account.
- NFR-013 Observability: Errors shall be capturable through local logs and structured diagnostics.
- NFR-014 Provenance quality: Agent-visible outputs shall retain source references and context bundle identifiers.
- NFR-015 Cross-platform support: The architecture shall support macOS, Windows, and Linux even if release sequencing starts with macOS.
- NFR-016 Artifact validity: Supported native artifact formats shall be schema-validated before durable writes are committed.
- NFR-017 Maintenance safety: Automated stewardship and bulk refactors shall default to previewable, bounded, and reversible behavior where technically feasible.
- NFR-018 Command latency: Command palette open and command dispatch feedback shall occur in under 100 ms for the 95th percentile on a warmed desktop session.

## 11. External Interface Requirements

### 11.1 User Interface

- The application shall provide a desktop interface with sidebar navigation, evidence panes, object views, command palette, search, graph views, working set dashboards, policy panels, and inspector panels.
- The application shall be keyboard-first, with mouse support as a complement.
- The application shall support configurable themes and typography without requiring a plugin.
- The application shall provide editors or inspectors for supported visual workspace artifacts and structured views.

### 11.2 File System Interface

- The app shall read and write evidence and attachments within configured vault roots.
- The app shall watch vault file changes through platform-native file watching where available.
- The app shall isolate internal metadata from authored evidence.

### 11.3 AI Provider Interface

- The app shall use a provider adapter pattern for local and remote model backends.
- The app shall support a local HTTP interface for Ollama-compatible calls.
- The app shall support pluggable remote providers through explicit credential configuration.

### 11.4 External Connector Interface

- The app shall support connector adapters for calendar, git, issue tracker, browser, and transcript sources.
- The app shall store connector state and provenance separately from authored evidence.

### 11.5 Agent Tool Interface

- The app shall expose typed tools for search, read evidence, inspect objects, inspect live models, compile context bundles, create tasks, create decisions, create commitments, request approvals, and apply structured transformations.
- The app shall support MCP-compatible resource and tool exposure.

### 11.6 Native Artifact Interface

- The app shall expose supported native artifact formats through documented schemas or deterministic serialization contracts.
- The app shall support validation of agent-generated or externally produced native artifacts before durable write.

### 11.7 Command-Line Interface

- The app shall provide a command-line interface for deterministic workspace automation and integration.
- The CLI shall support machine-readable output modes for agent or OS orchestration.

## 12. Data Requirements

### 12.1 Canonical Authored Evidence

- Notes shall be stored as Markdown files.
- Metadata shall use frontmatter and structured inline fields where possible.
- Attachments shall be stored as ordinary files under workspace-controlled asset paths.
- Supported visual workspace documents shall be stored in open, serializable formats.

### 12.2 Canonical Context Objects

- Intents, projects, tasks, decisions, commitments, constraints, resources, conversations, delegations, approvals, and state deltas shall have canonical local records with stable IDs.
- Canonical context objects shall be linkable to authored evidence and to each other.
- Candidate formalizations shall preserve source linkage, confidence, and review state until promoted.

### 12.3 Live Models

- Self, world, temporal, attention, and execution models shall have canonical local records.
- Live models shall be inspectable and editable where policy permits.

### 12.4 Memory Layers

- Scratch and session memory shall be separable from project, personal, and canonical memory.
- Promotions between memory layers shall be auditable.

### 12.5 Projected Data

- SQLite shall store indexes, graph edges, object projections, working set projections, freshness metadata, embeddings metadata, and app state.
- Projected data shall be rebuildable from canonical evidence, canonical context objects, live models, and explicit sync state where applicable.

### 12.6 Audit and Provenance Data

- Agent actions, approvals, denials, memory promotions, daemon reconciliations, and diffs shall be stored with timestamps and workspace-local identifiers.
- Users shall be able to clear non-canonical history without losing authored evidence.

### 12.7 Structured View Definitions

- Structured views, filters, formulas, and dashboard definitions shall be stored in human-readable or otherwise openly serializable formats.
- View definitions shall be executable by the app, inspectable by the user, and writable by agents subject to validation.

## 13. Constraints

- The system must preserve portability and avoid hard vendor lock-in.
- The architecture must not assume permanent internet connectivity.
- The product must keep trust boundaries explicit because it will execute agent workflows.
- The editor model must support both human authoring and structured machine reasoning.
- The system must not silently elevate generated summaries into canonical truth.
- The system must not allow the daemon or agent runtime to perform high-risk actions without policy and review controls.

## 14. MVP Acceptance Criteria

MVP is acceptable when all of the following are true:

- A user can open an existing Markdown vault and continue working without migration pain.
- Evidence creation, editing, linking, search, and backlinks are production-usable.
- Intents, projects, tasks, decisions, commitments, and constraints can be created and queried across the workspace.
- Self, world, temporal, and attention models can be inspected and updated at a useful baseline level.
- The working set can show what is active, blocked, stale, noisy, and waiting for review.
- The context daemon can reconcile ordinary workspace changes and surface meaningful deltas.
- The system can surface a maintenance queue containing stale, orphaned, duplicate, or under-structured workspace state.
- Projects can maintain inspectable operating dossiers that summarize current state, decisions, blockers, constraints, and next actions.
- The agent can compile a context bundle, explain it, and act from it with provenance.
- The user or agent can propose formalization of raw captures into typed objects without losing provenance.
- The system can generate a project resume bundle or handoff bundle without relying on prior chat history.
- The system can create, validate, and persist at least one open visual artifact type and one structured view definition type.
- The user can preview and approve at least one stewardship workflow or bulk workspace refactor before changes are applied.
- The CLI can perform core read and write automation for notes, objects, or views with deterministic output.
- The user can approve or deny write actions, delegation escalation, and memory promotions at a granular level.
- External evidence edits do not corrupt the workspace model.
- The app remains useful with no cloud account and no network connection.

## 15. Future Release Themes

- real-time shared workspaces
- advanced semantic retrieval and memory ranking
- plugin marketplace
- mobile companion apps
- publishing and read-only portals
- team policy controls and enterprise deployment

## 16. Open Risks

- rich editor plus Markdown fidelity can become a source of complexity and user distrust if round-tripping is imperfect
- agent autonomy can damage trust if permissioning, provenance, freshness handling, and delegation controls are weak
- sync and collaboration can dominate engineering cost if attempted too early
- over-structuring the knowledge model can slow capture and reduce adoption
- under-structuring the product can leave the agent reconstructing context from scratch forever
- an intrusive or opaque daemon can feel like surveillance rather than assistance
- over-eager maintenance or refactoring can damage user trust if cleanup actions feel arbitrary, lossy, or stylistically invasive

## 17. Glossary

- Vault: A user-owned collection of evidence, assets, and metadata roots.
- Evidence: Human-authored or imported material such as notes, clips, transcripts, or attachments.
- Context object: A first-class structured record such as an intent, decision, commitment, or resource.
- Live model: A structured representation of the self, world, time, attention, or execution state.
- Working set: The currently active set of goals, tasks, constraints, and evidence relevant to near-term work.
- Context daemon: A service that continuously reconciles changes into the live workspace model.
- Context compiler: A service that assembles task-specific bundles for agent work.
- Project operating dossier: A durable project summary containing goals, state, decisions, blockers, constraints, and next actions.
- Projection: Derived data optimized for search, graph queries, or UI use.
- Intent: A first-class object representing desired outcome, focus, or plan.
- Progressive formalization: Incremental conversion of raw evidence into typed context objects with review and provenance.
- Workspace stewardship: Ongoing maintenance workflows that keep the workspace organized, current, and agent-usable over time.
- Agent-native: Designed so software agents can understand and operate on workspace context directly.
- Local-first: The product remains useful and authoritative on the local device even when offline.
