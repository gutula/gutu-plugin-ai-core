# AI Core Developer Guide

Durable agent runtime, prompt governance, approval queues, and replay controls.

**Maturity Tier:** `Hardened`

## Purpose And Architecture Role

Acts as the durable control plane for agent execution, prompt governance, approval checkpoints, and replay-safe run state.

### This plugin is the right fit when

- You need **agent runtime**, **approval queues**, **replay-safe execution** as a governed domain boundary.
- You want to integrate through declared actions, resources, jobs, workflows, and UI surfaces instead of implicit side effects.
- You need the host application to keep plugin boundaries honest through manifest capabilities, permissions, and verification lanes.

### This plugin is intentionally not

- Not an everything-and-the-kitchen-sink provider abstraction layer.
- Not a substitute for explicit approval, budgeting, and audit governance in the surrounding platform.

## Repo Map

| Path | Purpose |
| --- | --- |
| `package.json` | Root extracted-repo manifest, workspace wiring, and repo-level script entrypoints. |
| `framework/builtin-plugins/ai-core` | Nested publishable plugin package. |
| `framework/builtin-plugins/ai-core/src` | Runtime source, actions, resources, services, and UI exports. |
| `framework/builtin-plugins/ai-core/tests` | Unit, contract, integration, and migration coverage where present. |
| `framework/builtin-plugins/ai-core/docs` | Internal domain-doc source set kept in sync with this guide. |
| `framework/builtin-plugins/ai-core/db/schema.ts` | Database schema contract when durable state is owned. |
| `framework/builtin-plugins/ai-core/src/postgres.ts` | SQL migration and rollback helpers when exported. |

## Manifest Contract

| Field | Value |
| --- | --- |
| Package Name | `@plugins/ai-core` |
| Manifest ID | `ai-core` |
| Display Name | AI Core |
| Domain Group | AI Systems |
| Default Category | AI & Automation / Agent Runtime |
| Version | `0.1.0` |
| Kind | `ai-pack` |
| Trust Tier | `first-party` |
| Review Tier | `R1` |
| Isolation Profile | `same-process-trusted` |
| Framework Compatibility | ^0.1.0 |
| Runtime Compatibility | bun>=1.3.12 |
| Database Compatibility | postgres, sqlite |

## Dependency Graph And Capability Requests

| Field | Value |
| --- | --- |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core` |
| Recommended Plugins | None |
| Capability Enhancing | None |
| Integration Only | None |
| Suggested Packs | None |
| Standalone Supported | Yes |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `workflow.execute.ai`, `notifications.enqueue.ai`, `ai.model.invoke`, `ai.tool.execute` |
| Provides Capabilities | `ai.runtime`, `ai.prompts`, `ai.approvals` |
| Owns Data | `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests` |

### Dependency interpretation

- Direct plugin dependencies describe package-level coupling that must already be present in the host graph.
- Requested capabilities tell the host what platform services or sibling plugins this package expects to find.
- Provided capabilities and owned data tell integrators what this package is authoritative for.

## Public Integration Surfaces

| Type | ID / Symbol | Access / Mode | Notes |
| --- | --- | --- | --- |
| Action | `ai.agent-runs.submit` | Permission: `ai.runs.submit` | Submit a governed AI run against approved tools and prompt versions.<br>Purpose: Start durable agent work without bypassing tenant, tool, prompt, or replay governance.<br>Idempotent<br>Audited |
| Action | `ai.approvals.approve` | Permission: `ai.approvals.approve` | Resolve an AI approval checkpoint with an explicit human decision.<br>Purpose: Allow sensitive AI steps to continue only after accountable human review.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.resume` | Permission: `ai.runs.resume` | Resume a governed AI run after a manual hold or escalation review.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.cancel` | Permission: `ai.runs.cancel` | Cancel a governed AI run and preserve the audit trail.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.escalate` | Permission: `ai.runs.escalate` | Escalate a governed AI run into a higher-priority operator or approval queue.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.branch` | Permission: `ai.runs.branch` | Non-idempotent<br>Audited |
| Action | `ai.runs.handoffs.prepare` | Permission: `ai.runs.handoffs.prepare` | Idempotent<br>Audited |
| Action | `ai.runs.handoffs.complete` | Permission: `ai.runs.handoffs.complete` | Idempotent<br>Audited |
| Action | `ai.runs.verifiers.record` | Permission: `ai.runs.verifiers.record` | Non-idempotent<br>Audited |
| Action | `ai.prompts.publish` | Permission: `ai.prompts.publish` | Publish a reviewed prompt version for governed use.<br>Purpose: Move prompt changes into an auditable, replay-safe published state before agents depend on them.<br>Non-idempotent<br>Audited |
| Resource | `ai.agent-runs` | Portal disabled | Durable execution record for a governed AI agent run.<br>Purpose: Track agent lifecycle, status, budget use, and replay-safe execution history.<br>Admin auto-CRUD enabled<br>Fields: `agentId`, `searchable`, `sortable`, `label`, `description`, `businessMeaning`, `status`, `filter`, `label`, `description`, `businessMeaning`, `modelId`, `searchable`, `sortable`, `label`, `description`, `businessMeaning`, `executionMode`, `filter`, `label`, `description`, `businessMeaning`, `processClass`, `searchable`, `sortable`, `label`, `description`, `businessMeaning`, `riskTier`, `filter`, `label`, `description`, `businessMeaning`, `slaMinutes`, `sortable`, `filter`, `label`, `description`, `businessMeaning`, `stepCount`, `sortable`, `filter`, `label`, `description`, `businessMeaning`, `artifactCount`, `sortable`, `filter`, `label`, `description`, `businessMeaning`, `evidenceCount`, `sortable`, `filter`, `label`, `description`, `businessMeaning`, `startedAt`, `sortable`, `label`, `description`, `businessMeaning` |
| Resource | `ai.prompt-versions` | Portal disabled | Versioned prompt artifact used for governed AI execution.<br>Purpose: Keep prompt bodies diffable, reviewable, and replay-safe across releases.<br>Admin auto-CRUD enabled<br>Fields: `templateId`, `searchable`, `sortable`, `label`, `description`, `version`, `sortable`, `label`, `description`, `status`, `filter`, `label`, `description`, `publishedAt`, `sortable`, `label`, `description` |
| Resource | `ai.approval-requests` | Portal disabled | Approval checkpoint raised by an AI run before a sensitive tool step.<br>Purpose: Make risky agent actions visible, reviewable, and explicitly resolvable by humans.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `searchable`, `sortable`, `label`, `description`, `toolId`, `searchable`, `sortable`, `label`, `description`, `state`, `filter`, `label`, `description`, `requestedAt`, `sortable`, `label`, `description`, `expiresAt`, `sortable`, `label`, `description` |
| Resource | `ai.run-artifacts` | Portal disabled | Inspectable artifacts emitted by durable AI runs.<br>Purpose: Keep plans, result packets, approval packets, and handoff artifacts visible and queryable.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `kind`, `label`, `createdAt` |
| Resource | `ai.run-evidence` | Portal disabled | Verification, policy, workflow, and notification evidence linked to durable AI runs.<br>Purpose: Make completion proof, policy checks, and escalation signals queryable by operators and downstream packs.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `kind`, `label`, `passed`, `createdAt` |
| Resource | `ai.run-events` | Portal disabled | Streamable lifecycle events emitted by durable AI runs.<br>Purpose: Expose status, branch, verifier, and handoff events for consoles and future webhook listeners.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `type`, `summary`, `createdAt` |
| Resource | `ai.runner-handoffs` | Portal disabled | Out-of-process or sandbox runner handoff records for governed runs.<br>Purpose: Track planned execution handoffs before same-process assumptions are removed.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `target`, `state`, `requestedAt` |
| Resource | `ai.verifier-results` | Portal disabled | Verifier results attached to governed AI runs.<br>Purpose: Make verifier hook outcomes queryable for release gates, run review, and future webhook streams.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `hookId`, `outcome`, `createdAt` |

### Job Catalog

| Job | Queue | Retry | Timeout |
| --- | --- | --- | --- |
| `ai.runs.intake` | `ai-intake` | Retry policy not declared | No timeout declared |
| `ai.runs.verify` | `ai-verify` | Retry policy not declared | No timeout declared |
| `ai.approvals.remind` | `ai-approvals` | Retry policy not declared | No timeout declared |
| `ai.approvals.escalate` | `ai-escalations` | Retry policy not declared | No timeout declared |


### Workflow Catalog

| Workflow | Actors | States | Purpose |
| --- | --- | --- | --- |
| `ai-run-lifecycle` | `requester`, `approver`, `operator`, `admin` | `intake`, `classified`, `planned`, `executing`, `waiting_approval`, `verifying`, `escalated`, `completed`, `failed`, `cancelled` | Keep intake, planning, approval, verification, and recovery states explicit and auditable. |
| `ai-run-approval` | `requester`, `approver`, `operator`, `admin` | `draft`, `pending`, `escalated`, `approved`, `rejected`, `expired`, `cancelled` | Track approval deadlines and escalation paths as explicit workflow state. |


### UI Surface Summary

| Surface | Present | Notes |
| --- | --- | --- |
| UI Surface | Yes | A bounded UI surface export is present. |
| Admin Contributions | Yes | Additional admin workspace contributions are exported. |
| Zone/Canvas Extension | No | No dedicated zone extension export. |

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

- Service results already return lifecycle event envelopes. Hosts should treat those envelopes as explicit orchestration outputs, not as incidental metadata.
- Job surface: `ai.runs.intake`, `ai.runs.verify`, `ai.approvals.remind`, `ai.approvals.escalate`.
- Workflow surface: `ai-run-lifecycle`, `ai-run-approval`.
- Recommended composition pattern: invoke actions, read resources, then let the surrounding Gutu command/event/job runtime handle downstream automation.

## Storage, Schema, And Migration Notes

- Database compatibility: `postgres`, `sqlite`
- Schema file: `framework/builtin-plugins/ai-core/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/ai-core/src/postgres.ts`
- Migration lane present: Yes

The plugin does not export a dedicated SQL helper module today. Treat the schema and resources as the durable contract instead of inventing undocumented SQL behavior.

## Failure Modes And Recovery

- Action inputs can fail schema validation or permission evaluation before any durable mutation happens.
- If downstream automation is needed, the host must add it explicitly instead of assuming this plugin emits jobs.
- Hosts that ignore returned lifecycle events may lose traceability or follow-up orchestration.
- Schema regressions are expected to show up in the migration lane and should block shipment.

## Mermaid Flows

### Primary Lifecycle

```mermaid
flowchart LR
  caller["Host or operator"] --> action["ai.agent-runs.submit"]
  action --> validation["Schema + permission guard"]
  validation --> service["AI Core service layer"]
  service --> state["ai.agent-runs"]
  service --> events["Lifecycle event envelopes"]
  service --> jobs["Follow-up jobs / queue definitions"]
  service --> workflows["Workflow state transitions"]
  state --> ui["Admin contributions"]
```

### Workflow State Machine

```mermaid
stateDiagram-v2
  [*] --> intake
  intake --> classified
  intake --> planned
  intake --> executing
  intake --> waiting_approval
  intake --> verifying
  intake --> escalated
  intake --> completed
  intake --> failed
  intake --> cancelled
```


## Integration Recipes

### 1. Host wiring

```ts
import { manifest, submitAgentRunAction, AgentRunResource, jobDefinitions, workflowDefinitions, adminContributions, uiSurface } from "@plugins/ai-core";

export const pluginSurface = {
  manifest,
  submitAgentRunAction,
  AgentRunResource,
  jobDefinitions,
  workflowDefinitions,
  adminContributions,
  uiSurface
};
```

Use this pattern when your host needs to register the plugin’s declared exports without reaching into internal file paths.

### 2. Action-first orchestration

```ts
import { manifest, submitAgentRunAction } from "@plugins/ai-core";

console.log("plugin", manifest.id);
console.log("action", submitAgentRunAction.id);
```

- Prefer action IDs as the stable integration boundary.
- Respect the declared permission, idempotency, and audit metadata instead of bypassing the service layer.
- Treat resource IDs as the read-model boundary for downstream consumers.

### 3. Cross-plugin composition

- Register the workflow definitions with the host runtime instead of re-encoding state transitions outside the plugin.
- Drive follow-up automation from explicit workflow transitions and resource reads.
- Pair workflow decisions with notifications or jobs in the outer orchestration layer when humans must be kept in the loop.

## Test Matrix

| Lane | Present | Evidence |
| --- | --- | --- |
| Build | Yes | `bun run build` |
| Typecheck | Yes | `bun run typecheck` |
| Lint | Yes | `bun run lint` |
| Test | Yes | `bun run test` |
| Unit | Yes | 2 file(s) |
| Contracts | Yes | 1 file(s) |
| Integration | Yes | 1 file(s) |
| Migrations | Yes | 1 file(s) |

### Verification commands

- `bun run build`
- `bun run typecheck`
- `bun run lint`
- `bun run test`
- `bun run test:contracts`
- `bun run test:integration`
- `bun run test:migrations`
- `bun run test:unit`
- `bun run docs:check`

## Current Truth And Recommended Next

### Current truth

- Exports 10 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`, `ai.agent-runs.branch`, `ai.runs.handoffs.prepare`, `ai.runs.handoffs.complete`, `ai.runs.verifiers.record`, `ai.prompts.publish`.
- Owns 8 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- Publishes 4 job definitions with explicit queue and retry policy metadata.
- Publishes 2 workflow definitions with state-machine descriptions and mandatory steps.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.
- Service results already expose lifecycle events for orchestration-aware hosts.

### Current gaps

- The repo does not yet export a domain parity catalog with owned entities, reports, settings surfaces, and exception queues.

### Recommended next

- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Add stronger persisted orchestration once long-running agent workflows leave the reference-runtime stage.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.

### Later / optional

- Provider-specific optimization surfaces once the cross-provider contract has been battle-tested.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
