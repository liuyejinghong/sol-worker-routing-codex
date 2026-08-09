---
name: sol-worker-routing
description: Use when Sol must keep the parent goal while routing bounded work directly, to the named fast 1M-context DeepSeek worker, or to the named depth-first Luna Max worker.
---

# Sol lead, adaptive bounded worker lanes

Use this as a small routing overlay. Explicit user instructions, permissions, project `AGENTS.md` files, and verified facts remain authoritative. Sol owns the parent objective, decomposition, cross-task decisions, acceptance, and final answer. Workers own only their bounded packets.

This is a user-chosen topology, not a claim that one model is best at every task. Do not re-run general model-tier comparisons for an eligible packet. Do not use Luna Medium as a silent substitute for `luna_worker`.

## 0. Direct-execution gate

Before making a packet, ask whether Sol can finish and verify the work in one focused action with no useful independent outcome. If yes, do it directly. Do not delegate tiny lookup, edit, or command tasks merely because workers exist.

## 1. Route by the work, not by model names

```text
tiny / one focused action                              -> Sol directly
ambiguous, coupled, shared-state, decision-heavy       -> Sol
read-heavy, source-pinned, mechanically checkable      -> deepseek_worker
large-context, throughput-sensitive, bounded work       -> deepseek_worker
depth-first, hidden-coupling, long-horizon semantics     -> luna_worker
```

Use `deepseek_worker` when speed, input volume, or cost is the main bottleneck and the objective, ownership, and acceptance are fixed. It is a general text-and-code worker, not only an extraction lane: use it for large-corpus reading, repository-wide analysis, structured reconciliation, focused diagnosis, and bounded implementation with explicit writable paths.

Use `luna_worker` when the task benefits more from sustained deep reasoning than from latency: subtle code review, hidden cross-module coupling, difficult failure diagnosis, or long-horizon implementation. Luna still needs explicit ownership and objective acceptance, but once dispatched it must be given time to finish.

When both workers could satisfy the same contract, choose DeepSeek for context and throughput pressure, and Luna for reasoning depth and semantic uncertainty. Do not duplicate the same packet merely to make workers vote. If evidence must precede implementation, use `worker evidence -> Sol decision -> worker implementation` only when the intermediate decision genuinely changes what will be built. If the named worker is unavailable or its effective route is unverified, keep the task with Sol or use another explicitly authorized lane. A profile on disk or a worker's self-report is not route proof.

## 2. DeepSeek high-context fast lane

DeepSeek V4 Flash provides a 1M model context window. Use that capacity to avoid prematurely fragmenting material that can be understood more accurately as one coherent packet. High-value packets include:

- fixed webpages, papers, or long documents -> evidence matrix;
- large repositories or diffs -> architecture maps, call sites, configuration references, and repeated-pattern checks;
- CI output, logs, or incident records -> error classes, frequency, and timeline;
- issues, pull requests, or release notes -> deduplication, module grouping, and status extraction;
- CSV, JSON, or API snapshots -> reconciliation, missing records, and anomaly candidates;
- localization or dependency records -> missing keys, placeholder mismatches, version matches, and affected-file candidates;
- bounded multi-file analysis or implementation -> diagnosis, changes, and named verification inside explicit ownership.

DeepSeek may make non-trivial local judgments needed to finish its packet. Architecture changes, source credibility, policy, authorization, release decisions, and final business judgment remain with Sol.

### Native web research

The supported official DeepSeek route exposes Codex's native `web_search` without a local bridge. Use it when search volume or webpage context is the bottleneck, while keeping the research judgment with Sol.

1. Sol defines the question, date range, source-quality bar, domain constraints, and required output.
2. DeepSeek performs bounded discovery and page reading with native `web_search`, records the exact URLs it used, and returns a compact evidence matrix. It must not silently widen the topic or replace requested primary sources with weaker commentary.
3. For a fixed source set, Sol may instead hand DeepSeek URLs or local artifacts directly; materializing every page first is optional, not a prerequisite.
4. Sol reopens the decisive primary sources, resolves conflicts, adds final citations, and owns the synthesis.

Native web search is not proof that arbitrary third-party MCP namespaces work. After a provider or client change, verify any required MCP tool separately. If that probe fails but native web search passes, keep web research on the native route and do not add a bridge merely to restore unrelated MCP tools.

Use this return shape unless the parent contract needs less:

```text
Source / title / date / URL or file:
Claim or extracted fact:
Support and limitation:
Conflict or missing evidence:
```

Open-ended discovery, source credibility, conflicting evidence, and legal, medical, financial, policy, or other high-risk conclusions stay with Sol. DeepSeek can still read and analyze a very large fixed web corpus in one packet.

## 3. Sol decomposes before dispatch

Split only at independently verifiable outcome boundaries, not by file count or a desire to fan out.

1. Lock the parent contract: final objective, invariant facts, minimum acceptance criteria, and authorization boundary.
2. Keep ambiguity, architecture, priorities, tradeoffs, external mutations, and final semantic judgment with Sol.
3. Form one observable worker outcome with compact context and explicit, non-overlapping ownership.
4. Apply the independence test: can the chosen worker finish, verify, or return a precise blocker without redefining scope or changing another task's state?
5. Send one packet. On return, compare evidence with the parent contract and integrate it yourself.

## 4. Worker packet

Send only necessary context in this shape:

```text
Worker and mode: deepseek_worker | luna_worker; read-only | write
Objective:
Scope and owned paths:
Relevant facts / source pins:
Non-goals:
Acceptance criteria:
Verification:
State-based stop condition:
Return format:
```

For any implementation packet, name writable paths. DeepSeek and Luna may write only when ownership, acceptance, and approval are explicit. An incomplete packet must produce an exact blocker, never a wider investigation. A stop condition must describe an outcome or blocker, not an elapsed-time limit.

## 5. Worker boundaries

- `deepseek_worker`: fast 1M-context general lane. It may analyze and implement inside the packet, but owns no parent architecture, policy, release, account, or authorization decision.
- `luna_worker`: depth-first semantic lane. It owns the reasoning needed to finish the packet, but no parent-goal, architecture, priority, release, or authorization change.
- Neither worker delegates further, changes external state, or performs unrelated cleanup.
- Pass later workers only a concise handoff of facts, changes, verification, risks, and blockers—not a full transcript.

## 6. Worker lease and interruption

A dispatched worker owns an execution lease until it returns a result or a state-based stop condition occurs. Long reasoning and the absence of commentary are normal, especially for Luna Max.

- A wait timeout means only that the polling window ended. It is not worker failure, lack of progress, or permission to interrupt.
- Never interrupt because a worker is silent, slower than expected, has not written files yet, or because Sol later decides the packet was larger than expected.
- Size and split the packet before dispatch. Once work has started, prefer continued waiting. If direction may need to change, send a non-terminating request for a checkpoint and preserve the returned analysis and changes.
- Interrupt only for explicit user cancellation or replacement, an upstream decision that makes the packet obsolete, observed scope or authorization violation, repeated concrete execution errors, or resource deadlock that blocks the parent task.
- Before interrupting recoverable work, request a checkpoint when possible and inspect owned paths for useful changes. Never issue duplicate interrupts to the same turn.

## 7. First-principles verification

Before adding a test, gate, dry run, review, or tool, answer:

1. What concrete irreversible risk does it protect?
2. What decision changes if it fails?
3. Why is the existing cheaper evidence insufficient?

Default to one focused contract check plus one real-path result check. Do not repeat unchanged validation. If verification exceeds implementation, or two consecutive steps only repair validation/tooling without adding facts about the objective, stop expanding the toolchain and report the remaining risk.

## 8. Parallelism and integrity

- Parallelism is optional. Use it only for independent scopes with disjoint write ownership.
- Start with at most two workers and depth one.
- After the first two results satisfy their packet schemas and acceptance checks, Sol may expand remaining independent, read-only DeepSeek shards to at most four active workers in total. Keep write-bearing DeepSeek work at two or fewer with disjoint ownership.
- Run at most two Luna workers concurrently, only with disjoint ownership. Prefer one Luna worker for any write-bearing task.
- Shared mutable state, ordered dependencies, or overlapping writes are sequential.
- Dispatch the named `deepseek_worker` or `luna_worker`, never a generic substitute. Re-check effective routing only after installation, a major client change, or observed mismatch.

### Sol reasoning posture

Where the client exposes a reasoning setting, recommend `gpt-5.6-sol` with `medium` effort for routine routing, packet construction, and integration. Escalate to `high` only for ambiguous architecture, conflicting evidence, high-stakes decisions, or complex cross-packet synthesis. The Skill describes this policy but cannot change the parent task's selected model or effort.

## 9. Installation and route recovery

When this workflow is being installed or the DeepSeek lane is unavailable, Sol owns the setup instead of sending the user away to edit Codex configuration:

1. Inspect the current `deepseek_worker` and its selected provider without printing secret material, then run one bounded task whose answer and acceptance are obvious. The supported upstream is the official DeepSeek API using `deepseek-v4-flash`, the official model catalog, and its 1,048,576-token context window.
2. Treat a successful real invocation as authoritative. Preserve the existing provider and credential mechanism exactly as it is; the absence of one environment variable, keychain item, command, or platform-specific backend is not failure evidence.
3. Only if the provider is absent or the invocation fails, inspect the current Codex client's supported provider and authentication interfaces. Configure only the selected DeepSeek provider and its credential reference using a mechanism native to that client and host environment. Never hard-code one operating system's credential store as the public workflow.
4. Confirm one direct text/tool result and one native `web_search` result. Test a third-party MCP namespace only when the workflow actually needs it; current native web acceptance does not depend on MCP.
5. If `spawn_agent` creates the custom-provider child but the child reports that no dynamic task payload arrived, classify the native subagent handoff as blocked rather than reinstalling the provider or retrying the same native payload. Use the installed foreground fallback at `$HOME/.agents/skills/sol-worker-routing/scripts/run-deepseek-worker.sh`: pass the unchanged packet on stdin, set `--cd` to the owned workspace, and select `--sandbox read-only` unless the packet explicitly grants writes. This runner invokes the official provider through `codex exec` at `max` reasoning, returns only the final Worker message, and creates no resident bridge. It restores DeepSeek execution but is not proof that the native subagent card or task handoff works.
6. Treat the fallback as the same bounded DeepSeek lane for routing and acceptance, but preserve the interface boundary: Sol owns invocation, cancellation, and final integration; the runner is a foreground process rather than a collaboration-managed child. Do not silently substitute another model if it fails.
7. OpenCode Go remains unsupported until it exposes the Codex Responses and tool contract directly. Do not install LiteLLM, a Responses-to-Chat bridge, or the alternate Go Worker profile.
8. If a different provider block already exists, diagnose the actual invocation before proposing a change. Do not overwrite a working custom setup. Never request a key in chat or place it directly in `config.toml`.
9. If the current task cannot discover a newly installed agent, ask the user only to start a new task, then run the probe automatically. Reopen the App only if discovery still fails.

Outside a repository installation, configuration mutation still requires explicit user authorization. The user may need to approve the change and enter a credential through a secure prompt, but must not be asked to discover the provider schema or installation steps.
