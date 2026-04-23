# AI Core

<p align="center">
  <img src="./docs/assets/gutu-mascot.png" alt="Gutu mascot" width="220" />
</p>

Durable agent runtime, prompt governance, approval queues, and replay controls.

![Maturity: Hardened](https://img.shields.io/badge/Maturity-Hardened-2563eb) ![Verification: Build+Typecheck+Lint+Test+Contracts+Migrations+Integration](https://img.shields.io/badge/Verification-Build%2BTypecheck%2BLint%2BTest%2BContracts%2BMigrations%2BIntegration-2563eb) ![DB: postgres+sqlite](https://img.shields.io/badge/DB-postgres%2Bsqlite-2563eb) ![Integration Model: Actions+Resources+Events+Jobs+Workflows+UI](https://img.shields.io/badge/Integration%20Model-Actions%2BResources%2BEvents%2BJobs%2BWorkflows%2BUI-0f766e)

## Part Of The Gutu Stack

| Aspect | Value |
| --- | --- |
| Repo kind | First-party plugin |
| Domain group | AI Systems |
| Default category | AI & Automation / Agent Runtime |
| Primary focus | agent runtime, approval queues, replay-safe execution |
| Best when | You need a governed domain boundary with explicit contracts and independent release cadence. |
| Composes through | Actions+Resources+Events+Jobs+Workflows+UI |

- Gutu keeps plugins as independent repos with manifest-governed boundaries, compatibility channels, and verification lanes instead of hiding everything behind one giant mutable codebase.
- This plugin is meant to compose through explicit actions, resources, jobs, workflows, and runtime envelopes, not through undocumented hook chains.

## What It Does Now

Acts as the durable control plane for agent execution, prompt governance, approval checkpoints, and replay-safe run state.

- Exports 10 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`, `ai.agent-runs.branch`, `ai.runs.handoffs.prepare`, `ai.runs.handoffs.complete`, `ai.runs.verifiers.record`, `ai.prompts.publish`.
- Owns 8 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- Publishes 4 job definitions with explicit queue and retry policy metadata.
- Publishes 2 workflow definitions with state-machine descriptions and mandatory steps.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.
- Service results already expose lifecycle events for orchestration-aware hosts.

## Maturity

**Maturity Tier:** `Hardened`

This tier is justified because unit coverage exists, contract coverage exists, integration coverage exists, migration coverage exists, job definitions are exported, workflow definitions are exported, and service results already carry orchestration signals.

## Verified Capability Summary

- Domain group: **AI Systems**
- Default category: **AI & Automation / Agent Runtime**
- Verification surface: **Build+Typecheck+Lint+Test+Contracts+Migrations+Integration**
- Tests discovered: **5** total files across unit, contract, integration, migration lanes
- Integration model: **Actions+Resources+Events+Jobs+Workflows+UI**
- Database support: **postgres + sqlite**

## Dependency And Compatibility Summary

| Field | Value |
| --- | --- |
| Package | `@plugins/ai-core` |
| Manifest ID | `ai-core` |
| Repo | [gutu-plugin-ai-core](https://github.com/gutula/gutu-plugin-ai-core) |
| Depends On | `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core` |
| Recommended Plugins | None |
| Capability Enhancing | None |
| Integration Only | None |
| Suggested Packs | None |
| Standalone Supported | Yes |
| Requested Capabilities | `ui.register.admin`, `api.rest.mount`, `data.write.ai`, `jobs.execute.ai`, `workflow.execute.ai`, `notifications.enqueue.ai`, `ai.model.invoke`, `ai.tool.execute` |
| Provided Capabilities | `ai.runtime`, `ai.prompts`, `ai.approvals` |
| Runtime | bun>=1.3.12 |
| Database | postgres, sqlite |
| Integration Model | Actions+Resources+Events+Jobs+Workflows+UI |

## Installation Guidance

- Required plugins: `auth-core`, `org-tenant-core`, `role-policy-core`, `audit-core`, `jobs-core`, `workflow-core`, `notifications-core`
- Recommended plugins: none
- Capability-enhancing plugins: none
- Integration-only plugins: none
- Suggested packs: none
- Standalone supported: yes


## Capability Matrix

| Surface | Count | Details |
| --- | --- | --- |
| Actions | 10 | `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`, `ai.agent-runs.branch`, `ai.runs.handoffs.prepare`, `ai.runs.handoffs.complete`, `ai.runs.verifiers.record`, `ai.prompts.publish` |
| Resources | 8 | `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results` |
| Jobs | 4 | `ai.runs.intake`, `ai.runs.verify`, `ai.approvals.remind`, `ai.approvals.escalate` |
| Workflows | 2 | `ai-run-lifecycle`, `ai-run-approval` |
| UI | Present | base UI surface, admin contributions |
| Owned Entities | 0 | No explicit domain catalog yet |
| Reports | 0 | No explicit report catalog yet |
| Exception Queues | 0 | No explicit exception queues yet |
| Operational Scenarios | 0 | No explicit operational scenario matrix yet |
| Settings Surfaces | 0 | No explicit settings surface catalog yet |
| ERPNext Refs | 0 | No direct ERPNext reference mapping declared |

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
import { manifest, submitAgentRunAction, AgentRunResource, jobDefinitions, workflowDefinitions, adminContributions, uiSurface } from "@plugins/ai-core";

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

- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Add stronger persisted orchestration once long-running agent workflows leave the reference-runtime stage.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.

## More Docs

See [DEVELOPER.md](./DEVELOPER.md), [TODO.md](./TODO.md), [SECURITY.md](./SECURITY.md), [CONTRIBUTING.md](./CONTRIBUTING.md). The internal domain sources used to build those docs live under:

- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/AGENT_CONTEXT.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/BUSINESS_RULES.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/EDGE_CASES.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/FLOWS.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/GLOSSARY.md`
- `plugins/gutu-plugin-ai-core/framework/builtin-plugins/ai-core/docs/MANDATORY_STEPS.md`
