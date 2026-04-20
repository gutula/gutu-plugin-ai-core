# AI Core Business Rules

## Invariants

- Each run belongs to one tenant and one agent definition.
- Run status changes must remain auditable.

## Lifecycle notes

- Runs may pause for approval checkpoints before completion.
- Replay-safe metadata must remain stable across investigations.

## Actor expectations

- ai-operator
- approver
- platform-admin

## Decision boundaries

- Document which decisions are automated, which are recommendation-only, and which always require a human or approval checkpoint.
- Document which policies or compliance rules override convenience.
- Document what counts as a safe retry versus a risky duplicate.