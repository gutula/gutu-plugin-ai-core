# AI Core Mandatory Steps

## Never skip

- Pin the prompt version before execution begins.
- Record replay-safe inputs and tool permissions for the run.
- Record whether the checkpoint was approved or rejected.
- Preserve the reviewer note whenever one is supplied.
- Publish prompt versions with a changelog when behavior changes.
- Keep prompt versions diffable for later replay and incident review.

## Human approvals and checkpoints

- Document when approvals are required, who can grant them, and what evidence must be present.

## Observability and audit

- Document the records, events, or notifications that must exist after each sensitive step.

## Agent operating notes

- Agents may recommend actions, but they must follow the same mandatory steps and approval gates as humans.
- Agents must never invent missing business facts; they should ask for clarification or cite the knowledge source.