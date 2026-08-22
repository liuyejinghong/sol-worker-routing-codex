---
name: sol-worker-routing
description: Use when Sol must keep the parent goal while routing bounded work directly, to the Luna Medium private-packet worker or depth-first Luna Max worker.
---

# Sol lead with two bounded Luna lanes

Use this as a small routing overlay. Explicit user instructions, permissions, project `AGENTS.md` files, and verified facts remain authoritative. Sol owns the parent objective, decomposition, source quality, architecture, cross-task decisions, acceptance, authorization, and final answer. Workers own only their bounded packets.

The supported topology is Sol plus two native Luna lanes: `luna_medium_worker` and `luna_worker`. `spark_scout`, `deepseek_worker`, and `deepseek_pro_worker` are retired and must not be routed even if a stale task still exposes their names. Codex 0.149.0 intentionally makes Agent roles inherit the parent model provider, so a role cannot select a non-OpenAI provider beneath an OpenAI parent; the earlier DeepSeek full-request workaround is therefore no longer usable.

## 0. Whole-agent anti-overdefense (HERO-derived)

Apply this first to Sol's own reasoning and work, including tasks with no delegation, and then to every routed packet and returned proposal. It is a behavior contract for the whole workflow, not a Worker-only routing rule. Each checked-in Luna profile carries the compact form directly so compliance does not depend on context inheritance or Skill activation.

Use it as a budget on what Sol or a Worker proposes, never as a filter on what it looks for. Report defects reachable through the project's supported inputs, interfaces, documentation, or real data, even when they sound unusual; do not dismiss a real finding because it resembles an edge case. Do not build for a merely theoretical case.

Use four labels to name the failure shape when it appears:

- `H` / hashing: checksums, fingerprints, or manifests that replace no more expensive operation and change no decision;
- `E` / edge cases: defenses for inputs, threats, or races that the supported use cannot reach;
- `R` / rubrics: checklists, scores, gates, or repeated reviews that re-check settled facts without a live uncertainty;
- `O` / overbuild: flags, wrappers, compatibility or migration layers, version trees, or guards justified mainly by another guard.

Before adding a check or defensive layer, state the live uncertainty, the concrete failure it could expose, the cheaper evidence already available, and what decision would change if it failed. Keep the primary deliverable moving and stop once its minimum acceptance and necessary real-path check pass. This does not waive security, migration, data-integrity, release, authorization, or verification work required by the user or project. Say plainly when a result is correct; do not manufacture a finding to justify a review. When feedback challenges one part, correct that part without abandoning the unaffected direction.

## 1. Direct-execution and availability gate

Before making a packet, ask whether Sol can finish and verify the work in one focused action with no useful independent outcome. If yes, do it directly. Do not delegate tiny lookup, edit, or command tasks merely because Workers exist.

Before choosing a Worker:

1. Current-task instructions such as “Sol only” or “no subagents” block new delegation without editing files or terminating work already running.
2. Persistent state wins next. `<profile>.toml` is enabled and `<profile>.toml.disabled` is disabled for new tasks. Use only `bash scripts/install.sh --lane-status`, `--enable-lane <luna_medium_worker|luna_worker|all>`, or `--disable-lane <luna_medium_worker|luna_worker|all>`.
3. A real route probe after installation or a material client change wins over a profile file. If a lane is unqualified, retain the task with Sol or use the other qualified Luna lane.

Upgrades preserve each Luna lane's enabled/disabled state. Unknown content, a missing expected profile, dual state files, symbolic links, and non-regular files are fail-closed conflicts. After any install or state change, use a new task to reload Agent discovery.

## 2. Route by the work

```text
tiny / one focused action                              -> Sol directly
ambiguous, coupled, shared-state, decision-heavy       -> Sol
private, narrow, semantically clear task packet        -> luna_medium_worker
depth-first, hidden-coupling, long-horizon semantics   -> luna_worker
```

Use `luna_medium_worker` only when the paths or sources, ownership, non-goals, interfaces or invariants, verification, and acceptance are already fixed. Good fits include a specified diff review, a named-module diagnosis with a target verifier, or constrained implementation. If it discovers hidden coupling, an unresolved root cause, or a broader decision, it returns a precise blocker; Sol decides whether to retain the task or issue a new Max packet.

Use `luna_worker` for Luna Max when the task benefits from sustained depth-first reasoning: subtle review, hidden cross-module coupling, difficult failure diagnosis, or long-horizon implementation. Max still needs explicit ownership and observable acceptance, but once dispatched it receives time to finish.

Do not duplicate a packet to make Workers vote. If evidence must precede implementation, use `Worker evidence -> Sol decision -> Worker implementation` only when the intermediate decision genuinely changes what will be built. Shared mutable state, ordered dependencies, and overlapping writes are sequential.

## 3. Route receipt and Worker packet

Immediately before the first non-obvious dispatch, publish one compact receipt:

```text
ROUTE RECEIPT
executor: luna_medium_worker | luna_worker
lane-policy: enabled + route-probed; soft exclusions if relevant
reason: actual bottleneck or risk this lane resolves
ownership: one implementer/verifier for each mutable scope; Sol retains final judgment
acceptance: one focused contract check + one real-path result
authorization: allowed local scope; excluded commit/push/release/external changes
review: none | fresh-context-required
```

Send the task in this shape:

```text
Worker and mode: luna_medium_worker | luna_worker; read-only | write
Objective:
Scope and owned paths:
Relevant facts / source pins:
Non-goals:
Interfaces / invariants: affected contracts, or `none`
Acceptance criteria:
Verification:
State-based stop condition:
Return format:
```

An implementation packet names writable paths. An incomplete packet produces an exact blocker, never a wider investigation. Workers do not delegate further, change external state, expand authorization, or perform unrelated cleanup. Pass a later Worker only a concise handoff of facts, changes, verification, risks, and blockers—not a full transcript.

## 4. Worker lease and interruption

A dispatched Worker owns an execution lease until it returns or a state-based stop condition occurs. Long reasoning and absence of commentary are normal, especially for Luna Max.

- A wait timeout means only that the polling window ended.
- Do not interrupt because a Worker is silent, slower than expected, or has not written files.
- If direction may need to change, request a non-terminating checkpoint and preserve useful analysis and changes.
- Interrupt only for user cancellation or replacement, task obsolescence, observed scope or authorization violation, repeated concrete errors, or resource deadlock.
- A Medium blocker never upgrades itself; Sol explicitly chooses any later Max packet.

## 5. Verification and review

Before adding a test, gate, dry run, review, or tool, answer:

1. What live uncertainty or concrete irreversible risk does it address?
2. What decision changes if it fails?
3. Why is existing cheaper evidence insufficient?

Default to one focused contract check plus one real-path result check. Do not repeat unchanged validation. If verification exceeds implementation without adding facts about the objective, stop expanding the toolchain and report the remaining risk.

Do not create a standing reviewer lane. When an explicitly requested fresh-context review could change delivery, its terminal verdict is `ship`, `fix-first`, or `rethink`. Any source change invalidates that verdict. `ship` never authorizes commit, push, merge, tag, release, deployment, account, or another external change.

## 6. Parallelism and ownership

- Parallelism is optional and only for independent scopes with disjoint write ownership.
- Start with one Worker; expand to at most four concurrent Luna Workers at depth one only when their scopes and ownership are independent.
- Prefer one Worker for any write-bearing task.
- In one stage, exactly one producer owns each writable path. Sol may inspect, guide, and verify but does not implement the same owned change in parallel.
- Dispatch the exact named lane; never substitute a generic role silently.

Where the client exposes a reasoning setting, recommend `gpt-5.6-sol` with `medium` effort for routine routing and integration. Escalate to `high` only for ambiguous architecture, conflicting evidence, high-stakes decisions, or complex synthesis. This Skill cannot change the parent task's selected model or effort.

## 7. Installation and route recovery

When this workflow is installed or a Luna lane is unavailable, Sol owns setup:

1. Run `bash scripts/install.sh --lane-status` before changing state.
2. The installer manages only the two Luna profiles and this Skill. It safely removes exact known retired Spark and DeepSeek profile files during upgrade but never edits DeepSeek Provider configuration, credentials, or model catalogs.
3. After installation or a state change, ask for a new task so Agent discovery reloads.
4. In that new task, probe each newly enabled Luna lane with a bounded task whose answer and acceptance are obvious. Inspect the named child lifecycle and result; a profile on disk is not route proof.
5. If a lane fails, diagnose the actual native route. Do not revive retired Spark or DeepSeek roles, create an API runner, or add a bridge as a substitute.

Outside repository installation, configuration mutation still requires explicit user authorization. Code or test completion does not authorize commit, push, merge, tag, release, deployment, or another external mutation.
