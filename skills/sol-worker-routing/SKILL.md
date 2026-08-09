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

### Web material handoff

Do not ask the OpenCode Go `deepseek_worker` to use Codex's built-in web-search namespace. The current bridge does not preserve Responses namespace tools, and open-ended source selection remains a Sol judgment even when another provider is used.

1. Sol defines the question, date range, source quality, and domain constraints.
2. Sol performs the smallest useful discovery pass, fixes the URL list, and saves the relevant page text or source excerpts as named artifacts. A URL-only handoff is not sufficient: the OpenCode Go worker may have neither the built-in web namespace nor outbound network access.
3. DeepSeek reads only those local source artifacts and returns a compact evidence matrix. If an artifact is missing, it reports the missing source instead of attempting open-ended browsing or substituting unrelated local evidence.
4. Sol checks primary claims, resolves conflicts, adds final citations, and owns the synthesis.

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

1. Inspect the current `deepseek_worker` and its selected provider without printing secret material, then run one bounded task whose answer and acceptance are obvious. Supported upstreams are the official DeepSeek API and OpenCode Go; configure only `deepseek-v4-flash` with a 1,000,000-token model context window for either route.
2. Treat a successful real invocation as authoritative. Preserve the existing provider and credential mechanism exactly as it is; the absence of one environment variable, keychain item, command, or platform-specific backend is not failure evidence.
3. Only if the provider is absent or the invocation fails, inspect the current Codex client's supported provider and authentication interfaces. Configure only the selected DeepSeek provider and its credential reference using a mechanism native to that client and host environment. Never hard-code one operating system's credential store as the public workflow.
4. For OpenCode Go, do not configure the OpenCode application. Its V4 Flash endpoint uses Chat Completions, while current Codex accepts only Responses providers. Select `agents/deepseek-worker.opencode-go.toml`, run the repository's local LiteLLM bridge, add only the provider block represented by `providers/opencode-go.codex.toml`, and verify the bridge plus one real Worker task. Confirm the client exposes the intended 1M window after installation or a major client change; a TOML field alone is not route proof. Obtain the Go API key through a secure local prompt or an already supported credential mechanism; never put it in chat, repository files, or Codex TOML.
5. If a different provider block already exists, diagnose the actual invocation before proposing a change. Do not overwrite a working custom setup. Never request a key in chat or place it directly in `config.toml`.
6. If the current task cannot discover a newly installed agent, ask the user only to start a new task, then run the probe automatically. Reopen the App only if discovery still fails.

Outside a repository installation, configuration mutation still requires explicit user authorization. The user may need to approve the change and enter a credential through a secure prompt, but must not be asked to discover the provider schema or installation steps.
