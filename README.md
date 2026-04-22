# AI Core

<p align="center">
  <img src="./docs/assets/gutu-mascot.png" alt="Gutu mascot" width="220" />
</p>

Durable agent runtime, prompt governance, approval queues, and replay controls.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test+Contracts](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts-6b7280) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+Jobs+Workflows+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BJobs%2BWorkflows%2BUI-2563eb)

## Part Of The Gutu Stack

| Aspect | Value |
| --- | --- |
| Repo kind | First-party plugin |
| Domain group | AI Systems |
| Primary focus | agent runtime, approval queues, replay-safe execution |
| Best when | You need a governed domain boundary with explicit contracts and independent release cadence. |
| Composes through | Actions+Resources+Jobs+UI |

- Gutu keeps plugins as independent repos with manifest-governed boundaries, compatibility channels, and verification lanes instead of hiding everything behind one giant mutable codebase.
- This plugin is meant to compose through explicit actions, resources, jobs, workflows, and runtime envelopes, not through undocumented hook chains.

## What It Does Now

Acts as the durable control plane for agent execution, prompt governance, approval checkpoints, and replay-safe run state.

- Exports 6 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.prompts.publish`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`.
- Owns 5 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`.
- Publishes 4 job definitions and 2 workflow definitions for intake, verification, approval reminders, escalations, and replay-safe lifecycle control.
- Adds richer admin workspace contributions with evidence, escalation, replay, and operator control surfaces.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Maturity

**Maturity Tier:** `Hardened`

This tier is justified because unit, contract, integration, and migration coverage now exist, and the plugin exports durable job and workflow catalogs alongside operator run-control surfaces.

## Verified Capability Summary

- Group: **AI Systems**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts+Integration+Migrations**
- Tests discovered: **5** total files across unit, contract, integration, and migration lanes
- Integration model: **Actions+Resources+Jobs+Workflows+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/ai-core` |
| Manifest ID | `ai-core` |
| Repo | [gutu-plugin-ai-core](https://github.com/gutula/gutu-plugin-ai-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core` |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `workflow.execute.ai`, `notifications.enqueue.ai`, `ai.model.invoke`, `ai.tool.execute` |
| Provided Capabilities | `ai.runtime`, `ai.prompts`, `ai.approvals` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+Jobs+Workflows+UI |

## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 6 | `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.prompts.publish`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate` |
| Resources | 5 | `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence` |
| Jobs | 4 | `ai.runs.intake`, `ai.runs.verify`, `ai.approvals.remind`, `ai.approvals.escalate` |
| Workflows | 2 | `ai-run-lifecycle`, `ai-run-approval` |
| UI | Present | base UI surface, admin contributions, approvals, replay, active-runs widgets |

## Quick Start For Integrators

Use this repo inside a **compatible Gutu workspace** or the **ecosystem certification workspace** so its `workspace:*` dependencies resolve honestly.

```bash
# from a compatible workspace that already includes this plugin's dependency graph
bun install
bun run build
bun run test
bun run docs:check
```

```ts
import { manifest, submitAgentRunAction, AgentRunResource, adminContributions, uiSurface } from "@plugins/ai-core";

console.log(manifest.id);
console.log(submitAgentRunAction.id);
console.log(AgentRunResource.id);
```

Use the root repo scripts for day-to-day work **after the workspace is bootstrapped**, or run the nested package directly from `framework/builtin-plugins/ai-core` if you need lower-level control.

## Current Test Coverage

- Root verification scripts: `bun run build`, `bun run typecheck`, `bun run lint`, `bun run test`, `bun run test:contracts`, `bun run test:integration`, `bun run test:migrations`, `bun run test:unit`, `bun run docs:check`
- Unit files: 2
- Contracts files: 1
- Integration files: 1
- Migrations files: 1

## Known Boundaries And Non-Goals

- Not an everything-and-the-kitchen-sink provider abstraction layer.
- Not a substitute for explicit approval, budgeting, and audit governance in the surrounding platform.
- Cross-plugin composition should use Gutu command, event, job, and workflow primitives. This repo should not be documented as exposing a generic WordPress-style hook system unless one is explicitly exported.

## Recommended Next Milestones

- Add emitted SQL migration assets and rollback helpers alongside the current schema-verification lane.
- Broaden the integration matrix beyond the current intake -> approval -> resume/reject -> verify -> complete flow.
- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Expand release gating and replay comparison flows where the current lifecycle already exposes strong evidence paths.
- Expose out-of-process runner handoff behind the same control-plane contracts once first-party same-process execution has stabilized.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/FLOWS.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/MANDATORY_STEPS.md`
