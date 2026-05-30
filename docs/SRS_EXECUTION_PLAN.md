# SRS Execution Plan

## Purpose

This document turns the SRS into an executable delivery sequence. It does not restate the SRS requirements; it specifies implementation order, checkpoints, and verification targets.

## Milestones

1. M1 - Vault and Capture Foundation
2. M2 - Context and Memory Model
3. M3 - Daemon and Context Compiler
4. M4 - Retrieval and Knowledge Graph
5. M5 - Agent Runtime and Delegation
6. M6 - External Grounding
7. M7 - Sync and Collaboration
8. M8 - Interop and CLI
9. M9 - Trust, Safety, and Evaluation
10. QG - Non-functional quality gates

## Execution Rules

- All feature work must map to one or more requirement IDs from `docs/SRS.md`.
- No requirement is marked done without tests and verification notes.
- Agent-write and memory-promotion paths are blocked by default until policy and approval checks are implemented.
- Schema validation is mandatory for generated native artifacts before durable write.
- Any migration-affecting change requires import/export verification against sample Markdown vaults.

## Current Status

- Foundation repository scaffold: done
  - Rust workspace with domain, storage, daemon, compiler, and agent runtime crates
  - Desktop frontend scaffold (`apps/desktop`)
  - Deterministic SRS matrix generation script
- Feature implementation against requirement IDs: started (see `docs/SRS_STATUS.csv`)
- Verification harnesses: started (`scripts/verify_srs_full_implementation.sh`)

## How To Execute

1. Regenerate requirement matrix:
   - `npm run srs:matrix`
   - status overrides are loaded from `docs/SRS_STATUS.csv`
2. Pick next milestone and mark selected IDs as `in_progress` in the matrix.
3. Implement with tests and commit using requirement IDs in commit messages.
4. Move IDs to `done` only after verification.
5. Re-run matrix generation after SRS updates.

## Done Criteria Per Requirement

A requirement is considered done only when all checks pass:

- Implementation exists in code under `apps/` or `crates/`
- Verification exists (unit, integration, or end-to-end test as appropriate)
- Safety rules are satisfied for side-effecting paths
- Documentation links to the implementation path
- Requirement status in execution matrix is set to `done`

## New PARITY TODO Breakdown

Track the newly added parity gap execution tickets here:
- [docs/OBSIDIAN_PARITY_TODO_BREAKDOWN.md](/Users/jay/Document
## New PARITY TO-DO Breakdown

Track the newly added parity gap execution tickets here:
- [docs/OBSIDIAN_PARITY_TODO_BREAKDOWN.md](/Users/jay/Document%20(Lcl)/Coding/ObisidiaX/docs/OBSIDIAN_PARITY_TODO_BREAKDOWN.md)

