# AI Core TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Exports 10 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`, `ai.agent-runs.branch`, `ai.runs.handoffs.prepare`, `ai.runs.handoffs.complete`, `ai.runs.verifiers.record`, `ai.prompts.publish`.
- Owns 8 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`, `ai.run-events`, `ai.runner-handoffs`, `ai.verifier-results`.
- Publishes 4 job definitions with explicit queue and retry policy metadata.
- Publishes 2 workflow definitions with state-machine descriptions and mandatory steps.
- Adds richer admin workspace contributions on top of the base UI surface.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.
- Service results already expose lifecycle events for orchestration-aware hosts.

## Current Gaps

- The repo does not yet export a domain parity catalog with owned entities, reports, settings surfaces, and exception queues.

## Recommended Next

- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Add stronger persisted orchestration once long-running agent workflows leave the reference-runtime stage.
- Add deeper provider, persistence, or evaluation integrations only where the shipped control-plane contracts already prove stable.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.

## Later / Optional

- Provider-specific optimization surfaces once the cross-provider contract has been battle-tested.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the baseline contracts settle.
