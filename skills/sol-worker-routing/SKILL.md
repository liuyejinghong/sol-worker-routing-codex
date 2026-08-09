---
name: sol-worker-routing
description: Use when Sol must keep the parent goal while routing bounded work directly, to the named DeepSeek evidence worker, or to the named Luna Max execution worker.
---

# Sol lead, adaptive bounded worker lanes

Use this as a small routing overlay. Explicit user instructions, permissions, project `AGENTS.md` files, and verified facts remain authoritative. Sol owns the parent objective, decomposition, cross-task decisions, acceptance, and final answer. Workers only return evidence for Sol to inspect.

This is a user-chosen topology, not a claim that one model is best at every task. Do not re-run general model-tier comparisons for an eligible packet. Do not use Luna Medium as a silent substitute for `luna_worker`.

## 0. Direct-execution gate

Before making a packet, ask whether Sol can finish and verify the work in one focused action with no useful independent outcome. If yes, do it directly. Do not delegate tiny lookup, edit, or command tasks merely because workers exist.

## 1. Route by the work, not by model names

```text
tiny / one focused action                              -> Sol directly
ambiguous, coupled, shared-state, decision-heavy       -> Sol
read-heavy, source-pinned, mechanically checkable      -> deepseek_worker
context-heavy, source-bounded, evidence-reducible       -> deepseek_worker
bounded semantic review / analysis / implementation    -> luna_worker
```

Use `deepseek_worker` when a large fixed input can be reduced to compact, named evidence under a fixed check: inventories, source fact extraction, static inspection, command results, structured extraction, or an explicitly authorized minimal mechanical patch.

Use `luna_worker` when the bounded outcome needs non-trivial code understanding: focused code review, module analysis, isolated implementation, or test-failure diagnosis. It still needs explicit ownership and objective acceptance.

If evidence precedes implementation, use the sequence `DeepSeek -> Sol decision -> Luna`; do not make the workers vote on the same task. If the named worker is unavailable or its effective route is unverified, keep the task with Sol or use another explicitly authorized lane. A profile on disk or a worker's self-report is not route proof.

## 2. Context-heavy evidence reduction

The highest-value DeepSeek packets have a large input, a compact output, fixed source boundaries, and mechanical acceptance. Good candidates include:

- fixed webpages, papers, or long documents -> evidence matrix;
- large repositories or diffs -> inventories, call sites, configuration references, and repeated-pattern checks;
- CI output, logs, or incident records -> error classes, frequency, and timeline;
- issues, pull requests, or release notes -> deduplication, module grouping, and status extraction;
- CSV, JSON, or API snapshots -> reconciliation, missing records, and anomaly candidates;
- localization or dependency records -> missing keys, placeholder mismatches, version matches, and affected-file candidates.

These packets return candidates and evidence, not architecture, credibility, security severity, or final business judgment.

### Web material handoff

Do not ask `deepseek_worker` to perform open-ended web discovery or use Codex's built-in web-search namespace. The current OpenCode Go bridge does not preserve Responses namespace tools, and source selection remains a Sol judgment even when another provider is used.

1. Sol defines the question, date range, source quality, and domain constraints.
2. Sol performs the smallest useful discovery pass and fixes a URL list, or saves the relevant page text as named artifacts.
3. DeepSeek reads only those fixed materials and returns a compact evidence matrix.
4. Sol checks primary claims, resolves conflicts, adds final citations, and owns the synthesis.

Use this return shape unless the parent contract needs less:

```text
Source / title / date / URL or file:
Claim or extracted fact:
Support and limitation:
Conflict or missing evidence:
```

Open-ended discovery, source credibility, conflicting evidence, and legal, medical, financial, policy, or other high-risk conclusions stay with Sol.

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
Worker and mode: deepseek_worker | read-only evidence
Objective:
Scope and owned paths:
Relevant facts / source pins:
Non-goals:
Acceptance criteria:
Verification:
Stop condition:
Return format:
```

For a Luna implementation packet, name writable paths. For DeepSeek, default to read-only; allow a patch only when writable paths, a mechanical acceptance check, and approval are explicit. An incomplete packet must produce an exact blocker, never a wider investigation.

## 5. Worker boundaries

- `deepseek_worker`: low-cost evidence lane. No architecture, policy, release, account, or broad semantic decision. No write by default.
- `luna_worker`: bounded semantic execution lane. No parent-goal, architecture, priority, or authorization changes.
- Neither worker delegates further, changes external state, or performs unrelated cleanup.
- Pass later workers only a concise handoff of facts, changes, verification, risks, and blockers—not a full transcript.

## 6. First-principles verification

Before adding a test, gate, dry run, review, or tool, answer:

1. What concrete irreversible risk does it protect?
2. What decision changes if it fails?
3. Why is the existing cheaper evidence insufficient?

Default to one focused contract check plus one real-path result check. Do not repeat unchanged validation. If verification exceeds implementation, or two consecutive steps only repair validation/tooling without adding facts about the objective, stop expanding the toolchain and report the remaining risk.

## 7. Parallelism and integrity

- Parallelism is optional. Use it only for independent scopes with disjoint write ownership.
- Start with at most two workers and depth one.
- After the first two results satisfy their packet schemas and acceptance checks, Sol may expand remaining independent, read-only DeepSeek shards to at most four active workers in total. This does not need fresh user approval because it does not broaden the task or mutation boundary.
- Run at most two Luna workers concurrently, only with disjoint ownership. Prefer one Luna worker for any write-bearing task.
- Shared mutable state, ordered dependencies, or overlapping writes are sequential.
- Dispatch the named `deepseek_worker` or `luna_worker`, never a generic substitute. Re-check effective routing only after installation, a major client change, or observed mismatch.

### Sol reasoning posture

Where the client exposes a reasoning setting, recommend `gpt-5.6-sol` with `medium` effort for routine routing, packet construction, and integration. Escalate to `high` only for ambiguous architecture, conflicting evidence, high-stakes decisions, or complex cross-packet synthesis. The Skill describes this policy but cannot change the parent task's selected model or effort.

## 8. Installation and route recovery

When this workflow is being installed or the DeepSeek lane is unavailable, Sol owns the setup instead of sending the user away to edit Codex configuration:

1. Inspect the current `deepseek_worker` and its selected provider without printing secret material, then run one bounded, read-only task whose answer and acceptance are obvious. Supported upstreams are the official DeepSeek API and OpenCode Go; configure only `deepseek-v4-flash` for either route.
2. Treat a successful real invocation as authoritative. Preserve the existing provider and credential mechanism exactly as it is; the absence of one environment variable, keychain item, command, or platform-specific backend is not failure evidence.
3. Only if the provider is absent or the invocation fails, inspect the current Codex client's supported provider and authentication interfaces. Configure only the selected DeepSeek provider and its credential reference using a mechanism native to that client and host environment. Never hard-code one operating system's credential store as the public workflow.
4. For OpenCode Go, do not configure the OpenCode application. Its V4 Flash endpoint uses Chat Completions, while current Codex accepts only Responses providers. Select `agents/deepseek-worker.opencode-go.toml`, run the repository's local LiteLLM bridge, add only the provider block represented by `providers/opencode-go.codex.toml`, and verify the bridge plus one real Worker task. Obtain the Go API key through a secure local prompt or an already supported credential mechanism; never put it in chat, repository files, or Codex TOML.
5. If a different provider block already exists, diagnose the actual invocation before proposing a change. Do not overwrite a working custom setup. Never request a key in chat or place it directly in `config.toml`.
6. If the current task cannot discover a newly installed agent, ask the user only to start a new task, then run the probe automatically. Reopen the App only if discovery still fails.

Outside a repository installation, configuration mutation still requires explicit user authorization. The user may need to approve the change and enter a credential through a secure prompt, but must not be asked to discover the provider schema or installation steps.
