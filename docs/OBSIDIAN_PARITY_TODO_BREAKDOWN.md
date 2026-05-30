# Parity TO-DO Breakdown for New Requirements

This file turns newly added parity gap requirements into executeable items.

## FR-SC-006 (Could): Mobile collaboration companion with conflict-tolerant sync and task/status updates

1. [ ] `SC006-T1` Define a sync-safe mobile snapshot format (note/task/object graph, version vector, conflict metadata, and sync token).
2. [ ] `SC006-T2` Implement mobile sync endpoints in the desktop runtime for exporting/importing workspace snapshots with conflict status and replayable deltas.
3. [ ] `SC006-T3` Add mobile companion view model APIs for reading working set, notes, and task/status state from snapshots.
4. [ ] `SC006-T4` Add conflict resolution policy hooks (last-writer-wins defaults, manual resolution queue, and scope-limited merge strategies).
5. [ ] `SC006-T5` Add integration tests for snapshot push/pull and conflict-retry flows with synthetic concurrent edits.

## FR-IE-013 (Could): Read-only publishing paths with safe redaction and privacy controls

1. [ ] `IE013-T1` Define published artifact schema (notes/tasks/projects package, redaction manifest, and publish metadata).
2. [ ] `IE013-T2` Implement secure redaction pipeline (secrets, private paths, tags, and metadata filters).
3. [ ] `IE013-T3` Implement read-only export/packager command and optional share token generation.
4. [ ] `IE013-T4` Add generated preview route or file emitter and expiration/revocation controls.
5. [ ] `IE013-T5` Add end-to-end tests for redaction correctness and package integrity.

## FR-IE-014 (Could): Mobile companion mode for safe read-only browsing, search, and lightweight review

1. [ ] `IE014-T1` Add role-aware mobile-read surface contract in the app API (note browse, search, and review actions).
2. [ ] `IE014-T2` Implement mobile-first read layout data views (search results, note summaries, review flags).
3. [ ] `IE014-T3` Add limited triage action support (bookmark, defer, queue review, ask for escalation) with strict capability gates.
4. [ ] `IE014-T4` Reuse publish/snapshot auth path from FR-IE-013 for mobile session bootstrap.
5. [ ] `IE014-T5` Add regression tests for offline read, token refresh, and unauthorized action blocking.
