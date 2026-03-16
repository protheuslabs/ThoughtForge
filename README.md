# Thoughtforge

Thoughtforge is a local-first, agent-native second-brain workspace. The goal is not "Obsidian plus AI". The goal is a desktop knowledge environment where thoughts, notes, intentions, tasks, context, and tools are organized so an agent can understand and act with explicit user permission.

The product should be a viable alternative interface to an agentic operating system, not just another chat window. Chat remains useful, but the durable system of record is the workspace itself.

Current working name: `Thoughtforge`
Name status: selected for planning and implementation, pending formal trademark/domain clearance before public launch.

## Product Thesis

- The user owns the vault. Notes stay readable on disk.
- Capture must be as fast as typing into a blank text file.
- Agents should work from durable context, not only transient chat history.
- AI actions must be inspectable, permissioned, and reversible.
- Obsidian feature parity is table stakes. The differentiator is agent-native thinking and execution.

## Selected Stack

| Layer | Recommendation | Why |
| --- | --- | --- |
| Desktop shell | Tauri 2 + Rust | Small binaries, strong trust boundary, native integrations, good security posture |
| Frontend | React 19 + TypeScript + Vite | Fast iteration, mature ecosystem, strong desktop UI support |
| Editor | Tiptap on ProseMirror | Headless, schema-driven rich text with strong extension model |
| Collaboration model | Yjs | CRDT-based local-first collaboration and conflict-free merges |
| Canonical note format | Markdown + frontmatter + asset folders | User-owned, portable, import/export friendly |
| Local metadata and indexes | SQLite | Reliable embedded database for app state, projections, and search indexes |
| Full-text search | SQLite FTS5 | Built-in relevance ranking, phrase, prefix, and boolean search |
| Local AI runtime | Provider adapter layer with Ollama support first | Local/private inference path and provider flexibility |
| Agent integration | MCP host/client support inside the app | Standard way to expose workspace context and tools to agents |
| Frontend state | Zustand for UI state, typed command/event layer for domain actions | Minimal overhead and clear separation of app state from domain state |
| Testing | Vitest, Playwright, Rust unit/integration tests | Good coverage across UI, app shell, and core engine |
| Packaging | Tauri bundler + signed desktop builds | Cross-platform desktop distribution |

## Selected Architecture

Build v1 as a local-first modular monolith with strict boundaries, not as microservices.

Core shape:

1. React desktop UI for workspace, editor, graph, search, and command palette.
2. Rust application core for vault management, indexing, background jobs, permissions, and integrations.
3. Markdown files as the user-owned source of truth.
4. SQLite as a projection layer for fast search, graph queries, and agent memory indexes.
5. Yjs as the collaboration and conflict-resolution layer.
6. An internal event bus so capture, indexing, summarization, extraction, and agent workflows can react to changes without tight coupling.
7. A provider-agnostic agent runtime that can call local or remote models and exposes the workspace over MCP.

## Core Product Pillars

- Capture: fast note creation, append flows, daily notes, clipping, voice-to-note, inboxes.
- Structuring: links, backlinks, tags, typed entities, graph view, tasks, projects, and intent objects.
- Retrieval: semantic and lexical search, saved queries, graph traversal, resurfacing, and summaries.
- Agent collaboration: ask the agent to read, organize, connect, summarize, plan, and execute with review points.
- Trust: local-first storage, explicit permissions, action previews, provenance, and strong audit history.

## Initial Scope

MVP should focus on a sharp core:

- Single-user desktop app for macOS first, then Windows and Linux.
- Markdown-native vaults with external file edit detection.
- Rich editor with wikilinks, embeds, tags, slash commands, tables, callouts, and block references.
- Fast search across note titles, content, tags, tasks, and entities.
- Agent command surface for summarize, extract entities, generate plans, refactor notes, and propose actions.
- Task/project layer that is first-class inside the graph.
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
- [Name Ideas](./docs/NAMES.md)

## Suggested Repo Layout

```text
apps/
  desktop/
crates/
  app-core/
  vault/
  indexer/
  agent-runtime/
  sync/
packages/
  ui/
  editor/
  shared-types/
docs/
```

## Decision Summary

- Use `Thoughtforge` as the working product name pending formal clearance.
- Use a modular monolith first.
- Keep Markdown as the canonical human-readable format.
- Treat SQLite as a projection and acceleration layer, not the primary authored store.
- Design the system around agent-readable structured context, not just documents.
- Build the permission model before broad agent execution features.

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
