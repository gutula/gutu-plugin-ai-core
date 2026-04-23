# AI Core Flows

## Happy paths

- `ai.agent-runs.submit`: Submit a governed AI run against approved tools and prompt versions.
- `ai.approvals.approve`: Resolve an AI approval checkpoint with an explicit human decision.
- `ai.agent-runs.resume`: Resume a governed AI run after a manual hold or escalation review.
- `ai.agent-runs.cancel`: Cancel a governed AI run and preserve the audit trail.
- `ai.agent-runs.escalate`: Escalate a governed AI run into a higher-priority operator or approval queue.
- `ai.agent-runs.branch`: Governed action exported by this plugin.
- `ai.runs.handoffs.prepare`: Governed action exported by this plugin.
- `ai.runs.handoffs.complete`: Governed action exported by this plugin.
- `ai.runs.verifiers.record`: Governed action exported by this plugin.
- `ai.prompts.publish`: Publish a reviewed prompt version for governed use.

## Operational scenario matrix

- No operational scenario catalog is exported today.

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

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

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

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.agent-runs.resume`

Resume a governed AI run after a manual hold or escalation review.

Permission: `ai.runs.resume`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.agent-runs.cancel`

Cancel a governed AI run and preserve the audit trail.

Permission: `ai.runs.cancel`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.agent-runs.escalate`

Escalate a governed AI run into a higher-priority operator or approval queue.

Permission: `ai.runs.escalate`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.agent-runs.branch`

Governed action exported by this plugin.

Permission: `ai.runs.branch`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s non-idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.runs.handoffs.prepare`

Governed action exported by this plugin.

Permission: `ai.runs.handoffs.prepare`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.runs.handoffs.complete`

Governed action exported by this plugin.

Permission: `ai.runs.handoffs.complete`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


### `ai.runs.verifiers.record`

Governed action exported by this plugin.

Permission: `ai.runs.verifiers.record`

Business purpose: Expose the plugin’s write boundary through a validated, auditable action contract.

Preconditions:

- Caller input must satisfy the action schema exported by the plugin.
- The caller must satisfy the declared permission and any host-level installation constraints.
- Integration should honor the action’s non-idempotent semantics.

Side effects:

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

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

- Mutates or validates state owned by `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- May return lifecycle event envelopes to the host runtime.
- May schedule or describe follow-up background work.

Forbidden shortcuts:

- Do not bypass the action contract with undocumented service mutations in application code.
- Do not document extra hooks, retries, or lifecycle semantics unless they are explicitly exported here.


## Cross-package interactions

- Direct dependencies: `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core`
- Requested capabilities: `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `workflow.execute.ai`, `notifications.enqueue.ai`, `ai.model.invoke`, `ai.tool.execute`
- Integration model: Actions+Resources+Events+Jobs+Workflows+UI
- ERPNext doctypes used as parity references: none declared
- Recovery ownership should stay with the host orchestration layer when the plugin does not explicitly export jobs, workflows, or lifecycle events.
