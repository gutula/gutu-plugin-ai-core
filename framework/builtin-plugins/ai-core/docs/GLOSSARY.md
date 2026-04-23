# AI Core Glossary

| Term | Meaning |
| --- | --- |
| AI Core | Durable agent runtime, prompt governance, approval queues, and replay controls. |
| ai.runtime | Capability published by this plugin manifest. |
| ai.prompts | Capability published by this plugin manifest. |
| ai.approvals | Capability published by this plugin manifest. |
| ai.agent-runs.submit | Submit a governed AI run against approved tools and prompt versions. |
| ai.approvals.approve | Resolve an AI approval checkpoint with an explicit human decision. |
| ai.agent-runs.resume | Resume a governed AI run after a manual hold or escalation review. |
| ai.agent-runs.cancel | Cancel a governed AI run and preserve the audit trail. |
| ai.agent-runs.escalate | Escalate a governed AI run into a higher-priority operator or approval queue. |
| ai.agent-runs.branch |  |
| ai.runs.handoffs.prepare |  |
| ai.runs.handoffs.complete |  |
| ai.runs.verifiers.record |  |
| ai.prompts.publish | Publish a reviewed prompt version for governed use. |
| ai.agent-runs | Durable execution record for a governed AI agent run. |
| ai.prompt-versions | Versioned prompt artifact used for governed AI execution. |
| ai.approval-requests | Approval checkpoint raised by an AI run before a sensitive tool step. |
| ai.run-artifacts | Inspectable artifacts emitted by durable AI runs. |
| ai.run-evidence | Verification, policy, workflow, and notification evidence linked to durable AI runs. |
| ai.run-events | Streamable lifecycle events emitted by durable AI runs. |
| ai.runner-handoffs | Out-of-process or sandbox runner handoff records for governed runs. |
| ai.verifier-results | Verifier results attached to governed AI runs. |
| ai.runs.intake | Job definition queued on `ai-intake`. |
| ai.runs.verify | Job definition queued on `ai-verify`. |
| ai.approvals.remind | Job definition queued on `ai-approvals`. |
| ai.approvals.escalate | Job definition queued on `ai-escalations`. |
| ai-run-lifecycle | End-to-end lifecycle for governed AI work execution. |
| ai-run-approval | Approval wait, reminder, and escalation lifecycle for sensitive AI mutations. |
| Agent runtime | Primary focus area for AI Core. |
| Approval queues | Primary focus area for AI Core. |
| Replay Safe execution | Primary focus area for AI Core. |
