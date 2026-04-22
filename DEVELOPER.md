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
| Action | `ai.agent-runs.resume` | Permission: `ai.runs.resume` | Resume a paused or approval-cleared AI run.<br>Purpose: Keep long-running governed AI work resumable without bypassing the stored control-plane state.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.cancel` | Permission: `ai.runs.cancel` | Cancel an in-flight or paused AI run.<br>Purpose: Stop unsafe or no-longer-needed work while preserving an auditable durable record.<br>Idempotent<br>Audited |
| Action | `ai.agent-runs.escalate` | Permission: `ai.runs.escalate` | Escalate an AI run into an operator queue with explicit reason and queue metadata.<br>Purpose: Make failures, policy concerns, or stalled approvals visible to humans before damage spreads.<br>Idempotent<br>Audited |
| Action | `ai.prompts.publish` | Permission: `ai.prompts.publish` | Publish a reviewed prompt version for governed use.<br>Purpose: Move prompt changes into an auditable, replay-safe published state before agents depend on them.<br>Non-idempotent<br>Audited |
| Resource | `ai.agent-runs` | Portal disabled | Durable execution record for a governed AI agent run.<br>Purpose: Track agent lifecycle, status, budget use, and replay-safe execution history.<br>Admin auto-CRUD enabled<br>Fields: `agentId`, `searchable`, `sortable`, `label`, `description`, `businessMeaning`, `status`, `filter`, `label`, `description`, `businessMeaning`, `modelId`, `searchable`, `sortable`, `label`, `description`, `businessMeaning`, `stepCount`, `sortable`, `filter`, `label`, `description`, `businessMeaning`, `startedAt`, `sortable`, `label`, `description`, `businessMeaning` |
| Resource | `ai.prompt-versions` | Portal disabled | Versioned prompt artifact used for governed AI execution.<br>Purpose: Keep prompt bodies diffable, reviewable, and replay-safe across releases.<br>Admin auto-CRUD enabled<br>Fields: `templateId`, `searchable`, `sortable`, `label`, `description`, `version`, `sortable`, `label`, `description`, `status`, `filter`, `label`, `description`, `publishedAt`, `sortable`, `label`, `description` |
| Resource | `ai.approval-requests` | Portal disabled | Approval checkpoint raised by an AI run before a sensitive tool step.<br>Purpose: Make risky agent actions visible, reviewable, and explicitly resolvable by humans.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `searchable`, `sortable`, `label`, `description`, `toolId`, `searchable`, `sortable`, `label`, `description`, `state`, `filter`, `label`, `description`, `requestedAt`, `sortable`, `label`, `description` |
| Resource | `ai.run-artifacts` | Portal disabled | Durable artifacts emitted by a governed AI run.<br>Purpose: Expose plans, checkpoints, receipts, and deliverables without scraping internal execution state.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `kind`, `label`, `contentType`, `createdAt` |
| Resource | `ai.run-evidence` | Portal disabled | Verification and replay evidence linked to a governed AI run.<br>Purpose: Keep approval, verification, and replay outcomes queryable as first-class read models.<br>Admin auto-CRUD enabled<br>Fields: `runId`, `kind`, `label`, `passed`, `capturedAt` |





### UI Surface Summary

| Surface | Present | Notes |
| --- | --- | --- |
| UI Surface | Yes | A bounded UI surface export is present. |
| Admin Contributions | Yes | Additional admin workspace contributions are exported. |
| Zone/Canvas Extension | No | No dedicated zone extension export. |

## Hooks, Events, And Orchestration

This plugin should be integrated through **explicit commands/actions, resources, jobs, workflows, and the surrounding Gutu event runtime**. It must **not** be documented as a generic WordPress-style hook system unless such a hook API is explicitly exported.

- No standalone plugin-owned lifecycle event feed is exported today.
- Job catalog: `ai.runs.intake`, `ai.runs.verify`, `ai.approvals.remind`, `ai.approvals.escalate`.
- Workflow catalog: `ai-run-lifecycle`, `ai-run-approval`.
- Recommended composition pattern: invoke actions, read resources, then compose approval waits, evidence reads, jobs, and workflows through the exported control-plane surfaces.

## Storage, Schema, And Migration Notes

- Database compatibility: `postgres`, `sqlite`
- Schema file: `framework/builtin-plugins/ai-core/db/schema.ts`
- SQL helper file: `framework/builtin-plugins/ai-core/src/postgres.ts`
- Migration lane present: No

The plugin does not export a dedicated SQL helper module today. Treat the schema and resources as the durable contract instead of inventing undocumented SQL behavior.

## Failure Modes And Recovery

- Action inputs can fail schema validation or permission evaluation before any durable mutation happens.
- Approval waits, replay mismatches, or missing evidence should route through the exported resume, cancel, or escalate controls instead of mutating run state directly.
- There is no separate lifecycle-event feed to rely on today; do not build one implicitly from internal details.
- Schema-affecting changes need extra care because there is no dedicated migration lane yet.

## Mermaid Flows

### Primary Lifecycle

```mermaid
flowchart LR
  caller["Host or operator"] --> action["ai.agent-runs.submit"]
  action --> validation["Schema + permission guard"]
  validation --> service["AI Core service layer"]
  service --> state["ai.agent-runs"]
  state --> ui["Admin contributions"]
```



## Integration Recipes

### 1. Host wiring

```ts
import { manifest, submitAgentRunAction, AgentRunResource, adminContributions, uiSurface } from "@plugins/ai-core";

export const pluginSurface = {
  manifest,
  submitAgentRunAction,
  AgentRunResource,
  
  
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

- Compose this plugin through action invocations and resource reads.
- If downstream automation becomes necessary, add it in the surrounding Gutu command/event/job runtime instead of assuming this plugin already exports a hook surface.

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

- Exports 6 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.prompts.publish`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`.
- Owns 5 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`.
- Publishes 4 job definitions and 2 workflow definitions for durable run control.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

### Current gaps

- Cross-repo workspace bootstrap is still required before the package can run end-to-end verification lanes in isolation.
- The repo validates schema shape and lifecycle behavior, but it still does not emit first-party SQL migration files from this package.
- Provider breadth remains intentionally narrow while the governed control plane hardens.

### Recommended next

- Add rollback helpers and emitted SQL migration assets alongside the current schema-verification lane.
- Broaden the integration matrix beyond the current submit -> approval -> resume/reject -> verify -> complete flow.
- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Expose out-of-process runner handoff behind the same control-plane contracts once first-party same-process execution has stabilized.

### Later / optional

- Provider-specific optimization surfaces once the cross-provider contract has been battle-tested.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
