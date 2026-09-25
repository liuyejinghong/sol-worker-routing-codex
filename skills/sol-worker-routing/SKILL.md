---
name: sol-worker-routing
description: Route bounded work under the current main Agent, including Astra. Choose models by task capability and total completion cost; Luna Max is the lowest-priority fallback. Keep requirements, integration and final acceptance with the main Agent. Use Agent-Bridge for external local agents, preserving their native workflow and capabilities.
---

# Main Agent with bounded workers

The current main Agent owns requirements, root-cause analysis, architecture, development packets, integration, acceptance, authorization, and the final answer. Astra (`gpt-6-astra`) is the current primary model; these responsibilities also apply to other supported parents. “Sol” in the package name and older instructions names this coordinator role, not a required model. Preserve the user's selected model and reasoning effort.

User instructions and existing authorization take precedence over this routing guidance within the applicable permission boundary. Continue authorized work through ordinary implementation choices and unknown facts that can be investigated in scope. Ask the user only for a missing decision that materially changes the objective or authorization, while continuing work that does not depend on that decision.

The only managed worker is `luna_worker` (Luna Max). Luna Medium (`luna_medium_worker`) is retired; keep its former small tasks with the main Agent. Retired `spark_scout`, `deepseek_worker`, and `deepseek_pro_worker` roles remain outside this workflow. Their historical Provider limitation and retirement contract are recorded in the repository's `AGENTS.md`; do not revive their native-role workaround or add a provider-protocol bridge. Agent-Bridge is the selected connector for external local agents; it does not restore those retired native roles. The native Luna restrictions and packet template below govern Luna, not Agent-Bridge workers. External workers follow the Agent-Bridge skill and the user's task instructions.

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
delegable work                                      -> task/capability/API-cost policy
Luna Max                                            -> lowest-priority fallback or explicit user choice
```

For native Luna workers, the main Agent defaults to directly implementing money and reservations, authorization boundaries, transactions, state machines, persistence/recovery, and core interfaces. A READY packet or separate directory does not make these semantics independent. Delegate only a narrow part whose inputs, exceptions and expected results are frozen and can be checked without reconstructing the core algorithm. A display that interprets unknown account state still contains core semantics. Controlled experiments on core delegation need a separate bounded evaluation, not a critical delivery.

Luna Max is the lowest-priority option, not the default for peripheral work. Use it when explicitly requested or when other suitable executors are unavailable. When selected, it implements independently verifiable peripheral work with frozen behavior and interfaces. It owns implementation and relevant tests within the development packet. It may choose local function structure, names, existing utilities, and necessary tests. A complete packet settles decisions that affect correctness without prescribing every line of code. A small task can use a concise message; a formal spec file is not mandatory.

A specifically assigned hypothesis check or bounded review can also go to Max when its evidence is independently useful. It does not own open-ended root-cause investigation, architecture, or business decisions. The `max` effort setting is not proof that delegation improves quality.

Do not duplicate packets to make Workers vote. Separate a hypothesis check from implementation only when its result changes the design; do not turn that into a mandatory two-pass workflow. Shared mutable state, ordered dependencies, and overlapping writes remain sequential.

## 2a. External local agents through Agent-Bridge

Use the installed `agent-bridge` skill and callable Agent-Bridge MCP tools for external local agents. The aim is to combine available agents and resources while preserving their native tools, permissions and workflows. OpenCode and ZCode are currently verified workers, not a permanent limit on supported products.

Use Agent-Bridge coordinator.instructions for current user preferences and Agent Bench routing/model-policy.json for historical comparisons. When an external Worker is worth using, default to ZCode with GLM-5.3-Flash through Agent-Bridge. A user-selected worker or model takes precedence. If ZCode is unavailable, report that before choosing another route; never bypass it with a direct model endpoint or an OpenCode model of the same name. DeepSeek V4.1 Flash, Muse Spark 1.3 Contributor, and GLM-5.3 remain comparison baselines, not default routes. Use correctness, final quality, official API-equivalent completion cost, elapsed time and observed rework together; a cheap token rate is not proof of cheap completed work. Luna Max has the lowest coordinator-selection priority. Give the worker the task, project directory and expected outcome in ordinary language. Do not carry over the retired OpenCode Worker's exact command whitelist, per-file permission machinery, single-task limit or fixed OMO role mapping. Normal authorization and project requirements still apply.

Keep the chosen session when continuing a task, inspect the actual files and checks before acceptance, and distinguish waiting from execution. After a bridge restart, inspect saved sessions and results before resubmitting an uncertain request: the installed Agent Bench patch preserves new request bindings across restarts, while missing or pruned task records require inspection rather than resubmission. Respect explicitly requested model identities and report any mapped or unavailable effort rather than pretending it was applied unchanged.

The locally configured `zcode` ACP worker has been verified with GLM-5.3 and GLM-5.3-Flash. This Bridge version does not apply `dispatch_task.model` or `effort` to custom ACP workers. Start its session with `/model GLM-5.3` or `/model GLM-5.3-Flash`, read the switch confirmation, then dispatch the task on the same session_id. Do not substitute OpenCode models for a requested ZCode run. Its generic discovery version is the Node entrypoint version, not the ZCode version.

The old `opencode-worker` plugin is retired and uninstalled; its source and tests are archived in codex-workflow/archives/opencode-worker-0.3.2-2026-09-12.tar.gz. Do not use it as an automatic fallback. Native Luna enable/disable state remains separate.

## 3. Route receipt and Worker packet

Before a non-obvious dispatch, briefly identify the executor, qualified lane, reason, owned scope, acceptance, authorization boundary, and `review: none | fresh-context-required`. Keep the user-facing receipt compact; put implementation detail in the packet.

For development, reuse an existing spec where available and supply enough context for the Worker to act independently:

```text
Worker and mode: luna_worker; read-only | write
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
5. If a lane fails, diagnose the actual native route. Do not revive retired Spark or DeepSeek roles or add a provider-protocol bridge as a native-route repair. Agent-Bridge has its own installation and validation; it is not installed by this script.

Outside repository installation, configuration mutation still requires explicit user authorization. Code or test completion does not authorize commit, push, merge, tag, release, deployment, or another external mutation.
