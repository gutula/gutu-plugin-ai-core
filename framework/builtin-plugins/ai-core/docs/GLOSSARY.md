# AI Core Glossary

## Terms

### ai.agent-runs

Durable execution record for a governed AI agent run.

- `agentId`: Agent definition that owns the run.
- `id`: Add the field meaning and how operators use it.
- `modelId`: Model profile used for the run.
- `startedAt`: Timestamp when the run started execution.
- `status`: Current lifecycle status of the agent run.
- `stepCount`: Number of persisted execution steps recorded for the run.
- `tenantId`: Add the field meaning and how operators use it.

### ai.approval-requests

Approval checkpoint raised by an AI run before a sensitive tool step.

- `id`: Add the field meaning and how operators use it.
- `requestedAt`: Timestamp when human review became required.
- `runId`: Agent run that emitted the approval request.
- `state`: Current decision state of the approval request.
- `tenantId`: Add the field meaning and how operators use it.
- `toolId`: Requested tool or action awaiting approval.

### ai.prompt-versions

Versioned prompt artifact used for governed AI execution.

- `id`: Add the field meaning and how operators use it.
- `publishedAt`: Timestamp when the prompt version became available for governed execution.
- `status`: Publication status of the prompt version.
- `templateId`: Prompt template family that this version belongs to.
- `tenantId`: Add the field meaning and how operators use it.
- `version`: Human-readable version label for the prompt body.


## Domain shortcuts to avoid

- Expand internal jargon that would confuse a new engineer or an AI agent.
- Document terms that are similar but not interchangeable.
- Call out any overloaded words such as account, order, customer, approval, or publish.