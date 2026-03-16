# Planning Decisions

These planning docs now assume `Thoughtforge` is being built as a cognitive control plane for a human-agent system, not a note app with AI layered on top.

## 1. Decisions You Do Not Want to Leave Fuzzy

These are the decisions teams usually postpone and then pay for later.

### 1.1 Canonical Evidence Contract

Decide exactly what counts as canonical authored evidence:

- Markdown body format
- frontmatter shape
- attachment path rules
- block ID encoding
- source metadata conventions

If this drifts, import/export and authoring trust both break.

### 1.2 Canonical Object Model

Decide the first-class object contract for:

- intents
- projects
- tasks
- decisions
- commitments
- assumptions
- open questions
- entities
- resources
- constraints
- conversations
- delegations
- approvals
- state deltas

This is the real product model. If it is fuzzy, the agent will never have stable ground truth.

### 1.3 Live Model Schema

Decide the schema and edit model for:

- self model
- world model
- temporal model
- attention model
- execution model

These cannot be hidden prompt templates. They need durable structure and clear ownership.

### 1.4 Stable Identity Strategy

Decide how evidence items, blocks, entities, tasks, decisions, delegations, and intents get stable IDs. Do not use file paths or titles as identity.

### 1.5 Memory Layer Policy

Decide what belongs in:

- scratch memory
- session memory
- project memory
- personal memory
- canonical memory

Then decide what can be auto-written, what can be promoted, and what always requires approval.

### 1.6 Context Daemon Contract

Decide:

- what event sources it observes
- how reconciliation works
- when it proposes versus applies updates
- how it surfaces drift and state deltas
- what is always human-reviewed

This is one of the core differentiators.

### 1.7 Context Compiler Contract

Decide how a context bundle is assembled:

- what inputs it considers
- how it ranks evidence versus objects versus recent events
- how it explains its choices
- how it flags stale, conflicting, or missing information
- how policy state affects inclusion

This is the heart of the agent experience.

### 1.8 Authority, Freshness, Confidence, and Bitemporal Schema

Decide:

- what counts as authoritative
- how freshness decays
- how confidence is represented
- how conflict resolution is surfaced
- how `recorded_at` and `effective_at` are modeled

Without this, old notes will be treated like live directives.

### 1.9 Agent Trust, Delegation, and Approval Model

Decide:

- what actions are auto-allowed
- what actions require approval
- what actions are never allowed
- how scope inheritance works inside a workflow
- how delegation ladders work
- how memory promotion approval works

This is core product design, not polish.

### 1.10 Simulation Semantics

Decide:

- which plans must be simulated before execution
- what counts as a risky workflow
- how simulations estimate impact
- how simulations are shown to the user

### 1.11 External Grounding Strategy

Decide which systems become first-class resources in v1:

- calendar
- git and GitHub
- issue trackers
- browser research
- meeting transcripts

Then decide whether they are mirrored, linked, or partially cached locally.

### 1.12 Retrieval and Evaluation Harness

You are building a system whose value depends on whether an agent actually understands the workspace.

That means you need a benchmark suite early:

- retrieval relevance tests
- object extraction accuracy tests
- decision and constraint recall tests
- task and intent planning quality tests
- citation and provenance validation
- stale-context failure tests
- delegation safety tests
- simulation-versus-real-outcome comparison

### 1.13 Migration Strategy from Obsidian

This matters more than it looks.

Decide:

- which Obsidian conventions are first-class
- how unsupported plugin syntax is handled
- whether import rewrites files or overlays metadata
- how notes are promoted into context objects
- what breaks and how it is reported

### 1.14 Plugin Security Model

Decide whether plugins run:

- in the frontend only
- in a sandboxed host
- with signed permissions

Do not expose raw filesystem or shell access casually.

### 1.15 Local Versus Remote AI Policy

Decide product modes:

- local-only mode
- hybrid mode
- remote-allowed mode

Then decide how no-send folders, redaction, and provider approvals work.

### 1.16 Sync Business Logic

If sync exists later, decide whether the sync layer is:

- evidence-file aware
- context-object aware
- live-model aware
- CRDT document aware
- projection aware

Do not let sync become an accidental rewrite of the storage model.

### 1.17 Trademark and Naming Risk

Be careful with anything too close to "Obsidian". Similar names may create avoidable trademark and brand confusion.

### 1.18 Licensing and Commercial Strategy

Decide early:

- source-available or open source
- plugin ecosystem licensing
- cloud add-ons versus local-only paid app
- sync pricing if sync exists

## 2. Recommended Product Roadmap

### Phase 0: Definition

Outcome:

- lock product thesis
- lock canonical evidence, object, and live-model contracts
- lock architecture and repo layout
- define benchmark vaults and acceptance criteria

### Phase 1: Core Local Control Plane

Outcome:

- vault open/create
- Markdown-native authoring
- wikilinks and backlinks
- search
- graph basics
- first-class objects for intents, tasks, projects, decisions, commitments, constraints, and approvals
- working set views
- self, world, temporal, and attention models
- external edit detection

Exit criteria:

- a power user can migrate a small Obsidian vault and turn active work into explicit context objects without losing flow

### Phase 2: Agent-Native Supervision

Outcome:

- context-aware command palette
- context compiler
- scratch and session memory
- delegation ladder
- proposed edits with diff review
- provenance and audit log
- local model integration

Exit criteria:

- a user can work with the agent from the workspace without depending on chat

### Phase 3: Continuous Symbiosis

Outcome:

- context daemon
- state delta generation
- drift detection
- freshness and authority scoring
- proactive bundle preparation
- calendar, git, issues, and meeting grounding

Exit criteria:

- the system continuously tracks what changed and prepares likely next-step context without the user restating it

### Phase 4: Bounded Autonomy

Outcome:

- policy engine
- simulation layer
- bounded autonomous workflows
- richer delegation and approval flows

Exit criteria:

- agents can execute meaningful multi-step work under explicit policy with strong user trust

### Phase 5: Collaboration and Ecosystem

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
- time from raw note to usable context object
- percentage of sessions where the working set is reviewed or updated
- percentage of proactive suggestions accepted
- percentage of agent outputs accepted without heavy rewrite
- number of decisions, tasks, or plans created from workspace context
- reduction in repeated context restatement across sessions

### System Quality Metrics

- vault open time
- search latency
- context compilation latency
- context daemon reconciliation latency
- indexing throughput
- crash recovery success rate
- percentage of agent edits with valid citations
- false-positive object extraction rate
- stale-context failure rate
- delegation safety failure rate

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

- center working sets, projects, decisions, commitments, and intents
- let agents act from context panels, selections, dashboards, and policies

### Risk 3: Remaining Document-Centric

If the product never promotes state beyond freeform notes, the agent will always be reconstructing context from scratch.

Mitigation:

- make core objects first-class
- make promotion from notes to objects effortless
- compile context bundles from both evidence and state

### Risk 4: Too Much Structure Too Early

If every thought must fit a schema, capture becomes slow and unnatural.

Mitigation:

- keep freeform capture primary
- project structure out of evidence rather than forcing it up front

### Risk 5: Agent Trust Failure

One bad destructive or overconfident action can permanently damage adoption.

Mitigation:

- approval gates
- reversible changes
- provenance
- least privilege by default
- simulation for risky workflows

### Risk 6: Surveillance or Intrusion Feel

If the context daemon feels invasive or opaque, users will not trust it.

Mitigation:

- make observed sources explicit
- make daemon actions inspectable
- default to conservative reconciliation
- allow per-source disable controls

### Risk 7: Sync Complexity Explosion

Sync can consume the roadmap if started too early.

Mitigation:

- ship strong offline single-user core first
- design sync boundaries now but implement later

## 5. Locked Baseline Decisions

These are the defaults to lock for implementation:

- Product name: Thoughtforge, pending formal trademark and domain clearance
- Product model: cognitive control plane for a human-agent system
- Canonical evidence: Markdown plus frontmatter
- First-class objects: intents, projects, tasks, decisions, commitments, assumptions, open questions, resources, constraints, conversations, delegations, approvals, state deltas
- Live models: self, world, temporal, attention, execution
- Native core: Rust
- Shell: Tauri 2
- UI: React 19 plus TypeScript
- Editor: Tiptap plus ProseMirror
- Search: SQLite FTS5 first, semantic second
- Context assembly: dedicated context compiler
- Continuous state: dedicated context daemon
- Memory model: explicit layered memory with promotion rules
- Autonomy model: policy engine plus delegation ladder plus simulation layer
- Sync: not in MVP
- Agent runtime: local-first with provider abstraction
- Plugin model: limited internal plugin API first, public marketplace later

## 6. Strategic Questions for the Next Pass

These are the best follow-up planning questions after this document set:

1. What is the exact canonical evidence, object, and live-model contract?
2. What are the top five agent actions we want to make magical in v1?
3. Which live-model fields are user-controlled versus daemon-derived?
4. What approval UX do we want for agent edits, external actions, delegation escalation, and memory promotion?
5. Which external systems are in the first grounding wave?
6. What benchmark vault will we use to measure "agent understands my workspace"?
