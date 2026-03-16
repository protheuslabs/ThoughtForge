# Thoughtforge

Thoughtforge is a local-first cognitive control plane for humans and agents.

The goal is not "Obsidian plus AI". The goal is a workspace that continuously models what the user is trying to do, what matters now, what is true, what has changed, what is blocked, and what an agent is allowed to do next.

Chat remains useful, but chat is not the system of record. The system of record is the workspace itself: authored evidence, first-class context objects, live state models, delegation policies, and task-specific context bundles compiled for agent work.

Current working name: `Thoughtforge`
Name status: selected for planning and implementation, pending formal trademark and domain clearance before public launch.

## Product Thesis

- The user owns the vault. Authored evidence stays readable on disk.
- Notes are one input type, not the entire product.
- The real primitives are `Intent`, `Project`, `Task`, `Decision`, `Commitment`, `Constraint`, `Assumption`, `OpenQuestion`, `Resource`, `Delegation`, `Approval`, and `StateDelta`.
- The system should maintain a live model of the user, the world, time, attention, and execution boundaries.
- Agents should work from compiled context bundles, not transient chat history or raw prompt stuffing.
- Every important fact should carry provenance, freshness, confidence, and authority.
- Autonomy should be bounded by explicit policy, approvals, and reversible actions.
- Obsidian feature parity is table stakes. The differentiator is agent-readable context and safe execution.

## Selected Stack

| Layer | Recommendation | Why |
| --- | --- | --- |
| Desktop shell | Tauri 2 + Rust | Small binaries, strong trust boundary, native integrations, good security posture |
| Frontend | React 19 + TypeScript + Vite | Fast iteration, mature ecosystem, strong desktop UI support |
| Editor | Tiptap on ProseMirror | Headless, schema-driven rich text with strong extension model |
| Collaboration model | Yjs | CRDT-based local-first collaboration and conflict-free merges |
| Canonical authored format | Markdown + frontmatter + asset folders | User-owned, portable, import/export friendly |
| Context and projection store | SQLite | Reliable embedded database for context objects, policies, memory layers, state deltas, and agent indexes |
| Full-text search | SQLite FTS5 | Built-in relevance ranking, phrase, prefix, and boolean search |
| Local AI runtime | Provider adapter layer with Ollama support first | Local/private inference path and provider flexibility |
| Agent integration | MCP host/client support inside the app | Standard way to expose workspace context and tools to agents |
| Frontend state | Zustand for UI state, typed command/event layer for domain actions | Minimal overhead and clear separation of UI state from domain actions |
| Testing | Vitest, Playwright, Rust unit/integration tests | Good coverage across UI, app shell, and core engine |
| Packaging | Tauri bundler + signed desktop builds | Cross-platform desktop distribution |

## Selected Architecture

Build v1 as a local-first modular monolith with strict boundaries, not as microservices.

Core shape:

1. React desktop UI for capture, workspace navigation, search, dashboards, review flows, and agent supervision.
2. Rust application core for vault management, context modeling, indexing, background jobs, permissions, and integrations.
3. Markdown files as the user-owned source of authored evidence.
4. SQLite as the canonical local store for structured context objects, memory layers, policies, state deltas, and rebuildable projections.
5. Yjs as the collaboration and conflict-resolution layer.
6. A context daemon that continuously observes local and connected events and reconciles them into the workspace model.
7. A context compiler that assembles task-specific bundles and explains why each item was selected.
8. A policy and delegation engine that determines what agents may do automatically, what requires approval, and what is forbidden.
9. A provider-agnostic agent runtime with a shared blackboard-style coordination surface, simulation hooks, and MCP interoperability.

## Core Product Model

- Authored evidence: freeform notes, clipped material, transcripts, attachments, and source passages.
- First-class context objects: intents, projects, tasks, decisions, commitments, assumptions, open questions, entities, resources, constraints, conversations, delegations, approvals, and state deltas.
- Live state models:
  self model for preferences, working style, communication style, and risk tolerance
  world model for people, systems, projects, commitments, dependencies, and resources
  temporal model for deadlines, rhythms, validity windows, and review cycles
  attention model for focus, deferrals, interruptions, noise, and working set priority
  execution model for permissions, automations, delegation boundaries, and fallback rules
- Memory layers: scratch, session, project, personal, and canonical memory with explicit write and promotion rules.
- Context daemon: a continuous reconciliation process that updates the live model as notes, tools, and external systems change.
- Context compiler: a service that assembles the right bundle for a specific job from evidence, objects, recent events, external state, and policy context.
- Policy engine: a guardrail layer that governs delegation, memory promotion, external actions, and bounded autonomy.
- Simulation layer: a preview step for risky or multi-step agent plans before real execution.

## Core Product Pillars

- Capture: fast note creation, append flows, daily notes, clipping, voice-to-note, inboxes, and evidence ingestion.
- State modeling: first-class objects, working sets, decisions, commitments, constraints, and live context reconciliation.
- Retrieval: lexical search, semantic retrieval, graph traversal, resurfacing, freshness-aware ranking, and state-aware context selection.
- Agent execution: typed tools, compiled context bundles, delegation policies, simulation previews, and object-level review.
- Trust: provenance, authority markers, permission scopes, approvals, action previews, and audit history.

## Initial Scope

MVP should focus on a sharp core:

- Single-user desktop app for macOS first, then Windows and Linux.
- Markdown-native vaults with external file edit detection.
- Rich editor with wikilinks, embeds, tags, slash commands, tables, callouts, and block references.
- First-class context objects for `Intent`, `Project`, `Task`, `Decision`, `Commitment`, `Constraint`, `Resource`, `Delegation`, and `Approval`.
- Self, world, temporal, and attention models with editable core fields.
- Working set and focus views that show what is active, blocked, stale, noisy, or awaiting review.
- A context daemon that reconciles vault changes and selected external connectors into the live model.
- A context compiler that assembles goal-specific bundles for agents and shows why each item was included.
- A delegation ladder from suggest-only to bounded autonomy with explicit approval requirements.
- Fast search across evidence, context objects, tasks, decisions, commitments, entities, and relationships.
- Agent command surface for summarize, extract entities, update project state, generate plans, create tasks, propose decisions, and request approvals.
- Import path from Obsidian-style vaults.
- Local model support and remote model adapter support.

Defer from MVP unless they are required by design:

- Real-time multi-user collaboration
- Mobile apps
- Public publishing
- Marketplace-scale plugin ecosystem
- Full cloud sync product

## Repo Docs

- [SRS](./docs/SRS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Planning](./docs/PLANNING.md)
- [Agent Context Strategy](./docs/AGENT_CONTEXT_STRATEGY.md)
- [Symbiosis Principles](./docs/SYMBIOSIS_PRINCIPLES.md)
- [Context Daemon Requirements](./docs/CONTEXT_DAEMON_REQUIREMENTS.md)
- [Delegation and Policy Model](./docs/DELEGATION_AND_POLICY_MODEL.md)
- [Name Decision](./docs/NAMES.md)

## Suggested Repo Layout

```text
apps/
  desktop/
crates/
  app-core/
  domain/
  vault/
  context-model/
  context-daemon/
  context-compiler/
  policy-engine/
  simulation/
  indexer/
  agent-runtime/
  connectors/
  sync/
  plugin-host/
packages/
  ui/
  editor/
  shared-types/
docs/
```

## Decision Summary

- Use `Thoughtforge` as the working product name pending formal clearance.
- Build a cognitive control plane, not a note app with AI added later.
- Keep Markdown as the canonical human-readable format for authored evidence.
- Treat notes as evidence and narrative, not the only primitive the agent sees.
- Use first-class context objects with stable IDs and typed relationships.
- Use SQLite for structured context, working sets, memory layers, policy state, and rebuildable projections.
- Continuously reconcile state through a context daemon rather than rebuilding context from scratch on every prompt.
- Compile task-specific context bundles instead of dumping raw retrieval output into prompts.
- Build delegation, approvals, freshness, authority, provenance, and simulation into the core model before broad autonomy.

## Reference Material

The stack recommendation was validated against current primary-source docs:

- Tauri start page: https://v2.tauri.app/start/
- Tauri security overview: https://v2.tauri.app/security/
- Tauri SQL plugin: https://v2.tauri.app/plugin/sql/
- React 19 stable release: https://react.dev/blog/2024/12/05/react-19
- ProseMirror guide: https://prosemirror.net/docs/guide/
- Tiptap overview: https://tiptap.dev/docs/editor/getting-started/overview
- Yjs docs: https://docs.yjs.dev/
- SQLite FTS5 docs: https://sqlite.org/fts5.html
- MCP architecture: https://modelcontextprotocol.io/specification/2024-11-05/architecture/index
- Ollama API docs: https://docs.ollama.com/api/introduction
