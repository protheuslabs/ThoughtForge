# Context Daemon Requirements

## 1. Purpose

The context daemon is the subsystem that continuously maintains Thoughtforge's live model of the user's state and environment.

Without it, the system becomes prompt reconstruction on demand. With it, the system becomes a living context layer.

## 2. Core Responsibilities

- observe workspace changes
- observe enabled external connectors
- reconcile observations into live models and context objects
- detect material state deltas
- surface drift between plans and reality
- prepare candidate context bundles for likely next actions

## 3. Inputs

### 3.1 Local Inputs

- note edits
- object updates
- task changes
- decision changes
- memory promotions
- approvals and denials

### 3.2 External Inputs

- calendar events
- git and GitHub activity
- issue tracker changes
- browser captures
- transcripts and meetings

## 4. Outputs

- updated live models
- updated working sets
- state delta records
- candidate object promotions
- candidate bundle suggestions
- drift warnings
- freshness updates

## 5. Requirements

- It must be inspectable.
- It must be conservative by default.
- It must be possible to disable or scope per source.
- It must not silently mutate high-authority state without policy permission.
- It must preserve provenance for every derived update.
- It must support replay or rebuild from durable event history where feasible.

## 6. Suggested Phases

### Phase 1

- local evidence changes
- object reconciliation
- working set updates

### Phase 2

- external connectors
- drift detection
- freshness scoring

### Phase 3

- proactive bundle preparation
- state-delta summarization
- escalation suggestions

## 7. Guardrails

- no destructive actions
- no memory promotion without explicit rules
- no silent external side effects
- no hidden observation sources
