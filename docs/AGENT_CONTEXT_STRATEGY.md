# Agent Context Strategy

## 1. Thesis

Thoughtforge should be built as the best context layer for agents, not as a note app with AI pasted on top.

At the next level, it should be built as a cognitive control plane for a human-agent system.

That means the product must represent more than documents. It must represent the user's active state, operating style, permissions, and evolving world.

## 2. Core Shift

Do not treat notes as the whole product.

Treat notes as one input type alongside:

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

Documents remain important, but mainly as evidence, narrative, and source material.

## 3. Product Model

Thoughtforge should have five layers:

### 3.1 Authored Evidence

- notes
- clips
- transcripts
- attachments
- highlighted passages

### 3.2 Canonical Context Objects

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

### 3.3 Live Models

- self model
- world model
- temporal model
- attention model
- execution model

### 3.4 Memory Layers

- scratch
- session
- project
- personal
- canonical

### 3.5 Derived Projections

- search indexes
- graph edges
- working sets
- freshness scores
- confidence scores
- authority markers

## 4. Context Daemon

The system should not reconstruct context only when the user asks a question.

It should maintain a context daemon that continuously:

- watches workspace changes
- ingests selected external events
- reconciles them into live models
- detects state drift
- emits meaningful state deltas
- prepares likely next-step context proactively

This is one of the core ways Thoughtforge stops being a passive notebook.

## 5. Context Compiler

Agents should not receive raw search results by default.

They should receive a compiled context bundle made from:

- the current goal
- relevant evidence
- relevant context objects
- recent decisions and commitments
- active constraints
- current working set
- external system state
- policy and delegation state
- provenance metadata

Every bundle should also answer:

- why each item was included
- what is stale
- what conflicts
- what is missing
- what is authoritative
- what the agent is allowed to do

## 6. Human-AI Symbiosis Principles

- The system should remember without forcing the user to repeat context.
- The system should know what changed since the last meaningful state.
- The system should distinguish brainstorms from commitments.
- The system should know when not to act.
- The system should prepare likely next-step context before the user opens chat.
- The system should improve the representation of the user's operating style over time.

## 7. Design Rules

- Never let generated summaries silently become truth.
- Never collapse provenance.
- Never rely only on embeddings for retrieval.
- Never make chat history the primary memory substrate.
- Never treat stale notes as current directives without an explicit freshness rule.
- Never allow broad autonomy without a policy boundary.

## 8. First-Class Requirements

### 8.1 Stable Identity

Every note, block, intent, decision, task, commitment, constraint, delegation, and resource needs a stable ID.

### 8.2 Provenance

Every extracted fact and agent output needs source references.

### 8.3 Freshness

The system must know what is current versus stale.

### 8.4 Authority

The system must know whether something is:

- user-authored truth
- imported external truth
- inferred context
- temporary agent memory

### 8.5 Promotion Rules

Agent-written scratch or session memory must not become project or canonical memory without explicit rules.

### 8.6 Delegation Rules

The system must know:

- what an agent may suggest
- what an agent may draft
- what an agent may execute in bounded form
- what always requires approval

## 9. External Grounding

To be a true context layer, Thoughtforge should ground against systems that already contain truth:

- calendar
- git and GitHub
- issue trackers
- browser research
- transcripts and meetings

These should become first-class resources linked into the object graph, not just pasted text.

## 10. UX Implications

- Agent invocation should work from notes, selections, projects, dashboards, tasks, decisions, and working sets.
- The UI should show the compiled context bundle used for each action.
- The UI should show missing context clearly.
- Review should be diff-based for content and object-based for structured state.
- Delegation level should be visible at all times.
- Risky multi-step plans should be simulated before execution.

## 11. v1 Product Test

Thoughtforge is on the right path if a user can:

1. capture a thought quickly as freeform evidence
2. promote relevant pieces into tasks, decisions, commitments, constraints, or resources
3. open a project or intent and see the live working set
4. see what changed since last time without manually reconstructing it
5. ask an agent to act from that context without restating everything in chat
6. inspect exactly what context the agent used and approve changes safely

## 12. Strategic Consequence

If Thoughtforge succeeds, it is not just competing with note apps.

It is competing to become the personal context substrate that agents rely on to understand a user's world, priorities, and execution boundaries.
