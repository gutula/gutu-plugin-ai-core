# AI Core TODO

**Maturity Tier:** `Hardened`

## Shipped Now

- Exports 6 governed actions: `ai.agent-runs.submit`, `ai.approvals.approve`, `ai.prompts.publish`, `ai.agent-runs.resume`, `ai.agent-runs.cancel`, `ai.agent-runs.escalate`.
- Owns 5 resource contracts: `ai.agent-runs`, `ai.prompt-versions`, `ai.approval-requests`, `ai.run-artifacts`, `ai.run-evidence`.
- Publishes 4 job definitions and 2 workflow definitions for intake, verification, approval reminders, escalations, and recovery-safe run control.
- Adds richer admin workspace contributions on top of the base UI surface, including evidence and escalation visibility.
- Defines a durable data schema contract even though no explicit SQL helper module is exported.
- Exports dedicated integration and migration verification lanes for approval lifecycle, replay mismatch, timeout recovery, and schema coverage.

## Current Gaps

- Cross-repo workspace bootstrap is still required before the package can run end-to-end verification lanes in isolation.
- The repo validates schema shape and lifecycle behavior, but it still does not emit first-party SQL migration files from this package.
- Provider breadth remains intentionally narrow while the governed control plane hardens.

## Recommended Next

- Add rollback helpers and emitted SQL migration assets alongside the current schema-verification lane.
- Broaden the integration matrix beyond the current submit -> approval -> resume/reject -> verify -> complete flow.
- Broaden provider adapters and richer operator diagnostics without weakening the current governance boundary.
- Expand operator diagnostics and release gating where the current lifecycle already exposes strong evidence paths.
- Expose out-of-process runner handoff behind the same control-plane contracts once first-party same-process execution is battle-tested.

## Later / Optional

- Provider-specific optimization surfaces once the cross-provider contract has been battle-tested.
- More connector breadth, richer evaluation libraries, and domain-specific copilots after the hardened control plane settles.
