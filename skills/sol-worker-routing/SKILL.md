---
name: sol-worker-routing
description: Use when Sol must keep the parent goal while routing a bounded task directly, to the named DeepSeek evidence worker, or to the named Luna Max execution worker.
---

# Sol lead, two bounded worker lanes

Use this as a small routing overlay. Explicit user instructions, permissions, project `AGENTS.md` files, and verified facts remain authoritative. Sol owns the parent objective, decomposition, cross-task decisions, acceptance, and final answer. Workers only return evidence for Sol to inspect.

This is a user-chosen topology, not a claim that one model is best at every task. Do not re-run general model-tier comparisons for an eligible packet. Do not use Luna Medium as a silent substitute for `luna_worker`.

## 0. Direct-execution gate

Before making a packet, ask whether Sol can finish and verify the work in one focused action with no useful independent outcome. If yes, do it directly. Do not delegate tiny lookup, edit, or command tasks merely because workers exist.

## 1. Route by the work, not by model names

```text
tiny / one focused action                              -> Sol directly
ambiguous, coupled, shared-state, decision-heavy       -> Sol
read-heavy, source-pinned, mechanically checkable      -> deepseek_worker
bounded semantic review / analysis / implementation    -> luna_worker
```

Use `deepseek_worker` when the conclusion is determined by compact, named evidence and a fixed check: inventories, source fact extraction, static inspection, command results, structured extraction, or an explicitly authorized minimal mechanical patch.

Use `luna_worker` when the bounded outcome needs non-trivial code understanding: focused code review, module analysis, isolated implementation, or test-failure diagnosis. It still needs explicit ownership and objective acceptance.

If evidence precedes implementation, use the sequence `DeepSeek -> Sol decision -> Luna`; do not make the workers vote on the same task. If the named worker is unavailable or its effective route is unverified, keep the task with Sol or use another explicitly authorized lane. A profile on disk or a worker's self-report is not route proof.

## 2. Sol decomposes before dispatch

Split only at independently verifiable outcome boundaries, not by file count or a desire to fan out.

1. Lock the parent contract: final objective, invariant facts, minimum acceptance criteria, and authorization boundary.
2. Keep ambiguity, architecture, priorities, tradeoffs, external mutations, and final semantic judgment with Sol.
3. Form one observable worker outcome with compact context and explicit, non-overlapping ownership.
4. Apply the independence test: can the chosen worker finish, verify, or return a precise blocker without redefining scope or changing another task's state?
5. Send one packet. On return, compare evidence with the parent contract and integrate it yourself.

## 3. Worker packet

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

## 4. Worker boundaries

- `deepseek_worker`: low-cost evidence lane. No architecture, policy, release, account, or broad semantic decision. No write by default.
- `luna_worker`: bounded semantic execution lane. No parent-goal, architecture, priority, or authorization changes.
- Neither worker delegates further, changes external state, or performs unrelated cleanup.
- Pass later workers only a concise handoff of facts, changes, verification, risks, and blockers—not a full transcript.

## 5. First-principles verification

Before adding a test, gate, dry run, review, or tool, answer:

1. What concrete irreversible risk does it protect?
2. What decision changes if it fails?
3. Why is the existing cheaper evidence insufficient?

Default to one focused contract check plus one real-path result check. Do not repeat unchanged validation. If verification exceeds implementation, or two consecutive steps only repair validation/tooling without adding facts about the objective, stop expanding the toolchain and report the remaining risk.

## 6. Parallelism and integrity

- Parallelism is optional. Use it only for independent scopes with disjoint write ownership.
- Start with at most two workers and depth one unless the user explicitly requests more.
- Shared mutable state, ordered dependencies, or overlapping writes are sequential.
- Dispatch the named `deepseek_worker` or `luna_worker`, never a generic substitute. Re-check effective routing only after installation, a major client change, or observed mismatch.

## 7. Installation and route recovery

When this workflow is being installed or the DeepSeek lane is unavailable, Sol owns the setup instead of sending the user away to edit Codex configuration:

1. Inspect the current `deepseek_worker`, `[model_providers.deepseek]`, and credential availability without printing secret material.
2. If the provider is absent or its credential is missing, run this Skill's `scripts/configure_deepseek_provider.py`. It may add only the known provider block and store the key through the hidden macOS Keychain prompt. Never request a key in chat or place it directly in `config.toml`.
3. If a different provider block already exists, stop and report the exact conflict. Do not overwrite a working custom setup.
4. Verify availability with one bounded, read-only task whose answer and acceptance are obvious. A profile file, config parse, or worker self-report is not enough.
5. If the current task cannot discover a newly installed agent, ask the user only to start a new task, then run the probe automatically. Reopen the App only if discovery still fails.

Outside a repository installation, configuration mutation still requires explicit user authorization. The user may need to approve the change and enter a credential through a secure prompt, but must not be asked to discover the provider schema or installation steps.
