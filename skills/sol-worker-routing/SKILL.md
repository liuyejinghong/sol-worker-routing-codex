---
name: sol-worker-routing
description: Route bounded work under the current main Agent, including Astra. Use Luna Max for frozen, independently verifiable peripheral work; keep core implementation, unresolved design and root-cause decisions with the main Agent. Use the optional OpenCode Worker plugin for bounded externally authorized OMO work when its tools are available.
---

# Main Agent with bounded workers

The current main Agent owns requirements, root-cause analysis, architecture, development packets, integration, acceptance, authorization, and the final answer. Astra (`gpt-6-astra`) is the current primary model; these responsibilities also apply to other supported parents. “Sol” in the package name and older instructions names this coordinator role, not a required model. Preserve the user's selected model and reasoning effort.

User instructions and existing authorization take precedence over this routing guidance within the applicable permission boundary. Continue authorized work through ordinary implementation choices and unknown facts that can be investigated in scope. Ask the user only for a missing decision that materially changes the objective or authorization, while continuing work that does not depend on that decision.

The only managed worker is `luna_worker` (Luna Max). Luna Medium (`luna_medium_worker`) is retired; keep its former small tasks with the main Agent. Retired `spark_scout`, `deepseek_worker`, and `deepseek_pro_worker` roles remain outside this workflow. Their historical Provider limitation and retirement contract are recorded in the repository's `AGENTS.md`; do not revive their native-role workaround or add a provider-protocol bridge. The separately installed, user-authorized OpenCode Worker plugin is an optional external execution channel; it does not restore those retired roles.

## 0. Whole-agent anti-overdefense (HERO-derived)

Apply HERO to the main Agent and every Worker, including direct work with no delegation. Each Luna profile carries a compact contract so it does not depend on context inheritance or Skill activation.

Use it as a budget on what the main Agent or a Worker proposes, never as a filter on what it looks for. Report defects reachable through the project's supported inputs, interfaces, documentation, or real data, even when they sound unusual; do not dismiss a real finding because it resembles an edge case. Do not build for a merely theoretical case.

Use four labels to name the failure shape when it appears:

- `H` / hashing: checksums, fingerprints, or manifests that replace no more expensive operation and change no decision;
- `E` / edge cases: defenses for inputs, threats, or races that the supported use cannot reach;
- `R` / rubrics: checklists, scores, gates, or repeated reviews that re-check settled facts without a live uncertainty;
- `O` / overbuild: flags, wrappers, compatibility or migration layers, version trees, or guards justified mainly by another guard.

Before adding a check or defensive layer, state the live uncertainty, the concrete failure it could expose, the cheaper evidence already available, and what decision would change if it failed. Keep the primary deliverable moving and stop once its minimum acceptance and necessary real-path check pass. This does not waive security, migration, data-integrity, release, authorization, or verification work required by the user or project. Say plainly when a result is correct; do not manufacture a finding to justify a review. When feedback challenges one part, correct that part without abandoning the unaffected direction.

## 1. Decide whether delegation pays off

Delegate only when the main Agent can assess the result with substantially less work than doing the task itself, and the expected benefit covers packet preparation, waiting, verification, and likely rework. If acceptance requires rereading the entire context or repeating the central reasoning, keep the task with the main Agent. Tiny tasks and tightly coupled work normally stay local; difficulty alone is not a reason to delegate to Luna Max.

Before choosing a Worker:

1. Current-task instructions such as “Sol only” or “no subagents” block new delegation without editing files or terminating work already running.
2. Persistent state wins next. `<profile>.toml` is enabled and `<profile>.toml.disabled` is disabled for new tasks. Use only `bash scripts/install.sh --lane-status`, `--enable-lane <luna_worker|all>`, or `--disable-lane <luna_worker|all>`.
3. A real route probe after installation or a material client change wins over a profile file. If a lane is unqualified, retain the task with the main Agent or use another qualified lane only if it fits the packet. Do not repeat unchanged route checks.

Upgrades preserve the Luna Max lane's enabled/disabled state. Unknown content, a missing expected profile, dual state files, symbolic links, and non-regular files are fail-closed conflicts. After any install or state change, use a new task to reload Agent discovery.

## 2. Route by the work

```text
small direct task, unresolved root cause or design    -> main Agent
tightly coupled work, costly-to-verify reasoning      -> main Agent
small, well-defined change or evidence task           -> main Agent
frozen peripheral behavior with independent examples -> luna_worker
```

For both native and external workers, the main Agent defaults to directly implementing money and reservations, authorization boundaries, transactions, state machines, persistence/recovery, and core interfaces. A READY packet or separate directory does not make these semantics independent. Delegate only a narrow part whose inputs, exceptions and expected results are frozen and can be checked without reconstructing the core algorithm. A display that interprets unknown account state still contains core semantics. Controlled experiments on core delegation need a separate bounded evaluation, not a critical delivery.

Luna Max implements independently verifiable peripheral work with frozen behavior and interfaces. It owns implementation and relevant tests within the development packet. It may choose local function structure, names, existing utilities, and necessary tests. A complete packet settles decisions that affect correctness without prescribing every line of code. A small task can use a concise message; a formal spec file is not mandatory.

A specifically assigned hypothesis check or bounded review can also go to Max when its evidence is independently useful. It does not own open-ended root-cause investigation, architecture, or business decisions. The `max` effort setting is not proof that delegation improves quality.

Do not duplicate packets to make Workers vote. Separate a hypothesis check from implementation only when its result changes the design; do not turn that into a mandatory two-pass workflow. Shared mutable state, ordered dependencies, and overlapping writes remain sequential.

## 2a. Optional OpenCode Worker plugin

When `opencode-worker` is installed and its MCP tools are callable in the current task, it is a candidate for bounded work explicitly allowed to use external execution. Discover its tools and consult `status` when needed; do not infer readiness from files on disk or repeatedly spend quota on empty probes. Dependency availability, actual runtime configuration and recent model success are different facts. `run` checks the runtime before dispatch; normal work does not need a preliminary status probe.

Respect the tools and argument limits advertised by the current task. If run or the new wait arguments are not yet available, use the existing status/wait tools within their advertised limits to finish already-started work; refresh tool discovery in a new task before new foreground dispatch. Do not force unsupported arguments or replace the plugin with an ad hoc CLI.

The 0.3.2 profile uses `opencode-go/deepseek-v4.1-flash` at `max` for coordination and hard roles, and `opencode-go/muse-spark-1.3-contributor` at `xhigh` for bulk roles. Use the exact model ID from the Provider catalog, not its family name (`deepseek-flash`). If the selected model is unavailable, report the mismatch; do not substitute V4 for V4.1 or create a different task profile to bypass it. Verify the installed tool version before using `model_mode: "omo"`; 0.2 remains single-model. Profile changes require explicit configuration and installation; repository development does not activate them. Respect the user's chosen executor. When none is specified, choose among the main Agent, qualified enabled Luna lanes and the available plugin by handoff cost and task fit. Do not interpret one integration test as proof that Muse always outperforms Luna. Contributor permits training on submitted inputs and outputs; existing external-use authorization applies without repeated confirmation.

Default to the plugin's `run` tool, which dispatches and waits inside one call. Use `wait_seconds: 300`; if using Code Mode, set the enclosing exec pragma `yield_time_ms` to 360000 so it covers the wait window and handoff margin. Do not repeatedly wake the model for empty status checks or periodic progress messages. Pass the same bounded packet and ownership contract used for native workers, plus the assigned absolute directory, exact writable paths and trusted commands. Keep request IDs stable across retries. The plugin owns its OpenCode session, runtime and result collection; the Skill does not reproduce that logic through shell commands.

Only one external task may run at a time. `finished=false`, including an unknown or cancelling task, retains file ownership. `completed` means execution ended, not acceptance. Inspect real artifacts, tool errors and relevant verification. Use followup with `wait_seconds: 300` for corrections within the same session and permissions. When cancelled or failed, recover changes before choosing another executor; never start a replacement writer merely because a wait timed out.

A foreground window can expire. If `wait_expired=true` and `finished=false`, keep ownership and repeat the identical run request or wait for that task; do not invent a new request ID. RPC interruption stops waiting, not execution. Use cancel only when execution should stop. Do not end the main response with unfinished work unless supported host followup is actually bound or the user explicitly chose manual followup. Background start remains available for that explicit mode but does not register any completion wakeup. This workflow keeps the current turn pending; it does not claim to wake an already-ended conversation.

In profile mode, the plugin runs one OMO primary role with at most two direct children, no nested delegation or fallback, and one writer across the tree. Read-only specialists remain read-only. Inspect child receipts as well as the root result; cancellation applies to the full tree. Single mode disables delegation. Its tools and permissions do not inherit Codex's sandbox. Allow only task-specific trusted foreground commands; read-only mode has no shell. Native Luna enabled/disabled state remains independent of the plugin.

If the plugin is absent, unavailable, or outside the user's authorization, keep the original routing choices. An explicitly requested Muse task must not silently switch to Luna, another Go model, Zen or a different paid Provider. Report the limitation and retain useful work.

## 3. Route receipt and Worker packet

Before a non-obvious dispatch, briefly identify the executor, qualified lane, reason, owned scope, acceptance, authorization boundary, and `review: none | fresh-context-required`. Keep the user-facing receipt compact; put implementation detail in the packet.

For development, reuse an existing spec where available and supply enough context for the Worker to act independently:

```text
Worker and mode: luna_worker | opencode-worker; read-only | write
Goal and observable behavior:
Settled design: affected module, state owner, interfaces and invariants, or `none`
Scope: readable sources, owned writable paths, non-goals, behavior to preserve
Source baseline / spec and relevant existing callers or tests:
Acceptance: independent input/expected-result examples, their business or source basis, actual entry point, relevant failure behavior
Tools: file-tool purposes and exact authorized commands; do not append shell commands
Decision boundary: implementation discretion and decisions to return to the main Agent
Return: changes, actual verification commands/results, spec deviations, unresolved items and evidence
Stop: return unsettled semantics, scope expansion or a repeated root cause to the main Agent
```

Missing facts that can be resolved within the assigned read scope do not require a new packet. If the spec conflicts with actual code, behavior or interface meaning must change, ownership must move, or work exceeds the assigned scope, pause the dependent implementation and return the specific conflict, evidence, and viable options. Continue unaffected authorized work. The main Agent resolves the question where existing authority permits, rather than automatically forwarding a Worker blocker to the user.

Workers preserve others' edits, do not delegate further, and do not change external state or expand authorization. Pass later Workers the relevant facts and source pointers, not a full transcript.

## 4. Worker lease and interruption

A dispatched Worker owns an execution lease until it returns or a state-based stop condition occurs. Long reasoning and absence of commentary are normal, especially for Luna Max.

- A wait timeout means only that the polling window ended.
- Do not interrupt because a Worker is silent, slower than expected, or has not written files.
- If direction may need to change, request a non-terminating checkpoint and preserve useful analysis and changes.
- Interrupt only for user cancellation or replacement, task obsolescence, observed scope or authorization violation, repeated concrete errors, or resource deadlock.

## 5. Verification and review

Before adding a test, gate, dry run, review, or tool, answer:

1. What live uncertainty or concrete irreversible risk does it address?
2. What decision changes if it fails?
3. Why is existing cheaper evidence insufficient?

Use the smallest verification that establishes the requested behavior. Low-risk wording changes may need only direct inspection; behavior changes need the affected path checked; shared interface changes need relevant consumer coverage. Complete explicitly required checks. Add or repeat tests only for new changes, failures, or unresolved concrete concerns, not to meet a fixed check count.

The main Agent checks business semantics, integration, and important failure paths against the agreed packet. Worker-authored tests alone are not sufficient evidence. Before core work begins, the main Agent sets a few expected outcomes from business facts, not implementation formulas. Use those examples through the public entry point and real storage when ordering or persistence matters. For fault injection, assert the intermediate state and actual side effects at the fault, then check recovery and absence of duplicate effects; a crash label or exit code is not proof. A second model rerunning the same tests is not independent evidence. Workers may add examples but must not rewrite the oracle to match their implementation; a disputed oracle returns to its business basis. Preserve useful evidence and correct parts of the patch when something fails. A small omission can go back for correction; an incorrect root cause, business interpretation, or interface assumption returns to the main Agent for diagnosis and replanning. After a first failure, give the reproducer, expected/actual difference, cause evidence and repair scope. If the same root cause fails again, or repair requires rebuilding core architecture, the main Agent defaults to taking over that core part after the entire previous writer tree is confirmed stopped. Judge new independent defects separately; preserve valid work. Do not coach a Worker through repeated speculative rewrites. Repeated substantial rework on the same task type is a reason to keep that work with the main Agent, not to grow the packet into a rulebook.

Do not create a standing reviewer lane. When an explicitly requested fresh-context review could change delivery, its terminal verdict is `ship`, `fix-first`, or `rethink`. Any source change invalidates that verdict. `ship` never authorizes commit, push, merge, tag, release, deployment, account, or another external change.

For completed delegations, reuse the existing task record: task category, first-pass acceptance, rework causes (code / requirements / tools), main-Agent preparation/review/repair effort, elapsed dispatch-to-acceptance time, and verifiable root/child usage. Unknown usage stays unknown. Waiting is not human work time. Judge total preparation, execution, review, rework and integration, not lines produced; one project is not a model ranking.

## 6. Parallelism and ownership

- Parallelism is optional and only for independent scopes with disjoint write ownership.
- Start with one Worker; expand to at most four concurrent Luna Workers at depth one only when their scopes and ownership are independent.
- Prefer one Worker for any write-bearing task.
- In one stage, exactly one producer owns each writable path. The main Agent may inspect, guide, and verify but does not implement the same owned change in parallel.
- Dispatch the exact named lane; never substitute a generic role silently.

The main Agent continues independent work while a Worker runs. Parallelism serves the task; it is not a quota. This Skill does not change the parent task's model or reasoning effort.

## 7. Installation and route recovery

When this workflow is installed or a Luna lane is unavailable, the main Agent owns setup. Run the commands from the workflow repository checkout, not an unrelated project's directory:

1. Run `bash scripts/install.sh --lane-status` before changing state.
2. The installer manages the Luna Max profile and this Skill. It preserves lane states and removes only exact known retired profiles; it never edits Providers, credentials, or model catalogs.
3. After installation or a state change, ask for a new task so Agent discovery reloads.
4. In that new task, probe each newly enabled Luna lane with a bounded task whose answer and acceptance are obvious. Inspect the named child lifecycle and result; a profile on disk is not route proof.
5. If a lane fails, diagnose the actual native route. Do not revive retired Spark or DeepSeek roles or add a provider-protocol bridge as a native-route repair. The optional OpenCode Worker plugin has its own installation and validation; it is not installed by this script.

Outside repository installation, configuration mutation still requires explicit user authorization. Code or test completion does not authorize commit, push, merge, tag, release, deployment, or another external mutation.
