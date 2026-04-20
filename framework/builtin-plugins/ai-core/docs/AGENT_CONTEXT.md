# AI Core Agent Context

Package/app id: `ai-core`
Target type: `package`  | Package kind: `ai-pack`
Location: `framework/builtin-plugins/ai-core`

## Purpose

Durable agent runtime, prompt governance, approval queues, and replay controls.

## System role

Describe how this target fits into the larger product, which teams depend on it, and which business outcomes it is responsible for.

## Declared dependencies

- audit-core
- auth-core
- jobs-core
- notifications-core
- org-tenant-core
- role-policy-core
- workflow-core

## Provided capabilities

- ai.approvals
- ai.prompts
- ai.runtime

## Requested capabilities

- ai.model.invoke
- ai.tool.execute
- api.rest.mount
- data.write.ai
- jobs.execute.ai
- notifications.enqueue.ai
- ui.register.admin
- workflow.execute.ai

## Core resources

### `ai.agent-runs`

Durable execution record for a governed AI agent run.

Business purpose: Track agent lifecycle, status, budget use, and replay-safe execution history.

Key fields:
- `agentId` (Agent) | Agent definition that owns the run. | Business meaning: Lets operators group runs by agent purpose and ownership.
- `id` (Id) | Add a field description so agents understand what this value means.
- `modelId` (Model) | Model profile used for the run. | Business meaning: Helps audit routing, cost, and quality decisions.
- `startedAt` (Started) | Timestamp when the run started execution. | Business meaning: Supports queue analysis, latency tracking, and investigation timelines.
- `status` (Status) | Current lifecycle status of the agent run. | Business meaning: Shows whether a run is active, waiting for approval, finished, or failed.
- `stepCount` (Steps) | Number of persisted execution steps recorded for the run. | Business meaning: Indicates how much work the agent performed and how deep the execution went.
- `tenantId` (Tenant Id) | Add a field description so agents understand what this value means.

### `ai.approval-requests`

Approval checkpoint raised by an AI run before a sensitive tool step.

Business purpose: Make risky agent actions visible, reviewable, and explicitly resolvable by humans.

Key fields:
- `id` (Id) | Add a field description so agents understand what this value means.
- `requestedAt` (Requested) | Timestamp when human review became required.
- `runId` (Run) | Agent run that emitted the approval request.
- `state` (State) | Current decision state of the approval request.
- `tenantId` (Tenant Id) | Add a field description so agents understand what this value means.
- `toolId` (Tool) | Requested tool or action awaiting approval.

### `ai.prompt-versions`

Versioned prompt artifact used for governed AI execution.

Business purpose: Keep prompt bodies diffable, reviewable, and replay-safe across releases.

Key fields:
- `id` (Id) | Add a field description so agents understand what this value means.
- `publishedAt` (Published) | Timestamp when the prompt version became available for governed execution.
- `status` (Status) | Publication status of the prompt version.
- `templateId` (Template) | Prompt template family that this version belongs to.
- `tenantId` (Tenant Id) | Add a field description so agents understand what this value means.
- `version` (Version) | Human-readable version label for the prompt body.

## Core actions

### `ai.agent-runs.submit`

Submit a governed AI run against approved tools and prompt versions.

Permission: `ai.runs.submit`

Business purpose: Start durable agent work without bypassing tenant, tool, prompt, or replay governance.

Preconditions:
- The tenant, actor, and agent identifiers must be valid.
- At least one allowed tool id must be provided.

Side effects:
- Creates a durable run record.
- May create an approval checkpoint before completion.

Forbidden shortcuts:
- Do not invoke undeclared tools outside the allowed tool list.
- Do not run with an unpublished or untracked prompt version.

### `ai.approvals.approve`

Resolve an AI approval checkpoint with an explicit human decision.

Permission: `ai.approvals.approve`

Business purpose: Allow sensitive AI steps to continue only after accountable human review.

Preconditions:
- The checkpoint must belong to the supplied run and tenant.
- The acting user must hold ai.approvals.approve permission.

Side effects:
- Resumes or terminates the associated run based on the decision.

Forbidden shortcuts:
- Agents must not self-approve their own checkpoints.

### `ai.prompts.publish`

Publish a reviewed prompt version for governed use.

Permission: `ai.prompts.publish`

Business purpose: Move prompt changes into an auditable, replay-safe published state before agents depend on them.

Preconditions:
- The prompt body must pass validation and review before publication.

Side effects:
- Creates a published prompt version record.

Forbidden shortcuts:
- Do not overwrite an existing published prompt body in place.

## Core workflows

_No workflows were discovered for this target._