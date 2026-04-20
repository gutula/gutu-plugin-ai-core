# AI Core Flows

## Happy paths

_No workflows were discovered for this target._

## Action-level flows

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

## Cross-package interactions

- Describe upstream triggers, downstream side effects, notifications, and jobs.
- Document when this target depends on auth, approvals, billing, or data freshness from another package.
- Document how failures recover and who owns reconciliation.