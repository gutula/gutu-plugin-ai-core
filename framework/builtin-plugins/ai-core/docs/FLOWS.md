# AI Core Flows

## Happy paths

- `ai.agent-runs.submit`: Submit a governed AI run against approved tools and prompt versions.
- `ai.approvals.approve`: Resolve an AI approval checkpoint with an explicit human decision.
- `ai.prompts.publish`: Publish a reviewed prompt version for governed use.

## Action-level flows

### `ai.agent-runs.submit`

Submit a governed AI run against approved tools and prompt versions.

Permission: `ai.runs.submit`

Business purpose: Start durable agent work without bypassing tenant, tool, prompt, or replay governance.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.approvals.approve`

Resolve an AI approval checkpoint with an explicit human decision.

Permission: `ai.approvals.approve`

Business purpose: Allow sensitive AI steps to continue only after accountable human review.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.prompts.publish`

Publish a reviewed prompt version for governed use.

Permission: `ai.prompts.publish`

Business purpose: Move prompt changes into an auditable, replay-safe published state before agents depend on them.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s non-idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `workflow.execute.ai`, `notifications.enqueue.ai`, `ai.model.invoke`, `ai.tool.execute`
- Integration model: Actions+Resources+Jobs+UI
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
