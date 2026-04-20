# AI Core TODO

**Maturity Tier:** `Baseline`

## Shipped Now

- Exports 3 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.prompts.publish`.
- Owns 3 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.

## Current Gaps

- No dedicated integration test lane is exported in this repo today; validation currently leans on build, lint, typecheck, and test lanes.
- The plugin owns durable data state, but it does not yet ship a dedicated migration verification lane in this repo.
- No standalone plugin-owned event, job, or workflow catalog is exported yet; compose it through actions, resources, and the surrounding Gutu runtime.

## Recommended Next

- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Add stronger persisted orchestration once long-running agent workflows leave the reference-runtime stage.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Add targeted integration coverage once the current lifecycle path is stable enough to benefit from end-to-end assertions.
- Add explicit migration or rollback coverage if this domain becomes more operationally sensitive.
- Promote important downstream reactions into explicit commands, jobs, or workflow steps instead of relying on implicit coupling.

## Later / Optional

- Provider-specific optimization surfaces once the cross-provider contract has been battle-tested.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
