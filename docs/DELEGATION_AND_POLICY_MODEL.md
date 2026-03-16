# Delegation and Policy Model

## 1. Purpose

Thoughtforge should not jump directly from "assistant" to "autonomous agent".

It should support a bounded delegation ladder governed by explicit policy.

## 2. Delegation Ladder

### Level 0: Observe

- agent may read and analyze
- agent may not draft or change durable state

### Level 1: Suggest

- agent may suggest actions or plans
- agent may not write durable state

### Level 2: Draft

- agent may create drafts, proposed edits, or candidate objects
- user approval required before durable changes

### Level 3: Bounded Execute

- agent may perform approved action classes within clear constraints
- durable changes and external side effects remain policy-limited

### Level 4: Policy-Limited Autonomy

- agent may execute predefined bounded workflows automatically
- only within narrow policy and review rules

## 3. Policy Dimensions

Policies should be able to govern:

- which tools may be used
- which object types may be modified
- which folders or resources may be read
- which memory layers may be written
- which external systems may be touched
- which actions always require approval

## 4. Approval Objects

Approvals should be first-class records with:

- requested action
- rationale
- affected objects
- estimated side effects
- requester
- approver
- timestamp
- final disposition

## 5. Simulation

Risky or multi-step plans should support simulation before execution.

Simulation should show:

- expected changes
- affected objects
- external systems touched
- uncertain assumptions
- reversible versus irreversible actions

## 6. Hard Rules

- destructive actions require explicit approval
- external side effects require explicit approval unless narrowly policy-whitelisted
- promotion into durable memory requires explicit policy
- delegation escalation requires explicit user action

## 7. UX Requirements

- current delegation level should always be visible
- the user should see why an action was blocked or allowed
- approvals should be object-based and diff-based
- policy should feel inspectable, not magical
