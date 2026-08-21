---
name: sol-worker-routing
description: Use when Sol must keep the parent goal while routing bounded work directly, to the named read-only Spark Scout, fast DeepSeek Flash, balanced DeepSeek Pro, Luna Medium private-packet, or depth-first Luna Max worker.
---

# Sol lead, adaptive bounded worker lanes

Use this as a small routing overlay. Explicit user instructions, permissions, project `AGENTS.md` files, and verified facts remain authoritative. Sol owns the parent objective, decomposition, cross-task decisions, acceptance, and final answer. Workers own only their bounded packets.

This is a user-chosen topology, not a claim that one model is best at every task. Do not re-run general model-tier comparisons for an eligible packet. `luna_medium_worker` and `luna_worker` are separate named lanes: never silently substitute Medium for the depth-first Max worker.

## 0. Whole-agent anti-overdefense (HERO-derived)

Apply this first to Sol's own reasoning and work, including tasks with no delegation, and then to every routed packet and returned proposal. It is a behavior contract for the whole workflow, not a Worker-only routing rule. Each checked-in Worker profile carries the compact form directly so compliance does not depend on context inheritance or Skill activation.

Use it as a budget on what Sol or a Worker proposes, never as a filter on what it looks for. Report defects reachable through the project's supported inputs, interfaces, documentation, or real data, even when they sound unusual; do not dismiss a real finding because it resembles an edge case. Do not build for a merely theoretical case.

Use four labels to name the failure shape when it appears:

- `H` / hashing: checksums, fingerprints, or manifests that replace no more expensive operation and change no decision;
- `E` / edge cases: defenses for inputs, threats, or races that the supported use cannot reach;
- `R` / rubrics: checklists, scores, gates, or repeated reviews that re-check settled facts without a live uncertainty;
- `O` / overbuild: flags, wrappers, compatibility or migration layers, version trees, or guards justified mainly by another guard.

Before adding a check or defensive layer, state the live uncertainty, the concrete failure it could expose, the cheaper evidence already available, and what decision would change if it failed. Keep the primary deliverable moving and stop once its minimum acceptance and necessary real-path check pass. This does not waive security, migration, data-integrity, release, authorization, or verification work required by the user or project; those are part of the contract. A small real check that touches the suspected path is proportionate even when a broad audit would not be. Say plainly when a result is correct; do not manufacture a finding to justify a review. When feedback challenges one part, correct that part without abandoning the unaffected direction.

## 0.1 Direct-execution gate

Before making a packet, ask whether Sol can finish and verify the work in one focused action with no useful independent outcome. If yes, do it directly. Do not delegate tiny lookup, edit, or command tasks merely because workers exist.

## 0.2 Routing governance and availability

Apply these checks before choosing a Worker, in order:

1. Current-task soft disables win. “Do not use DeepSeek,” “do not use Spark,” “Sol only,” and “no subagents” block new matching delegation for this task. They do not edit files and do not terminate a Worker already executing.
2. Persistent hard disable wins next. A lane is enabled only when its installed `<profile>.toml` is discoverable; `<profile>.toml.disabled` means unavailable for new tasks. Do not try to revive a disabled or undiscoverable lane from an old task. Ask for a new task after a user-authorized state change.
3. A real route qualification wins over a profile file. If the lane's native route has not been probed after installation or a material client change, retain the work with Sol or use another eligible, verified lane.

Hard-state operations are exact and explicit: `bash scripts/install.sh --lane-status`, `--enable-lane <lane|deepseek|all>`, and `--disable-lane <lane|deepseek|all>`. `deepseek` means Flash and Pro; `all` means five Workers and never Sol. A DeepSeek hard disable only changes the two profile filenames: it must not touch provider configuration, credentials, or the model catalog. An upgrade preserves every known lane state and introduces new lanes disabled; unknown content, a missing expected profile, dual state files, symbolic links, and non-regular files are fail-closed conflicts, never an invitation to guess.

## 0.3 Route receipt for non-obvious delegation

Immediately before the first Worker dispatch for a non-obvious task, publish one compact receipt in the parent task. Do not emit one for Sol-only work or repeat it for an unchanged packet.

```text
ROUTE RECEIPT
executor: spark_scout | deepseek_worker | deepseek_pro_worker | luna_medium_worker | luna_worker
lane-policy: enabled + route-probed; soft exclusions if relevant
reason: actual bottleneck or risk this lane resolves
ownership: implementer, verifier, and Sol's retained final judgment
acceptance: one focused contract check + one real-path result
authorization: allowed local scope; excluded commit/push/release/external changes
review: none | fresh-context-required
```

The receipt records a decision; it is not a second routing state machine. `ownership` has one implementation producer for each mutable scope. `review: fresh-context-required` is used only when an independent review could change the delivery decision.

## 1. Route by the work, not by model names

```text
tiny / one focused action                              -> Sol directly
ambiguous, coupled, shared-state, decision-heavy       -> Sol
bounded, read-only evidence reconnaissance             -> spark_scout
read-heavy, source-pinned, mechanically checkable      -> deepseek_worker
large-context, throughput-sensitive, bounded work       -> deepseek_worker
bounded, semantic, retry-expensive work                  -> deepseek_pro_worker
private, narrow, semantically clear task packet           -> luna_medium_worker
depth-first, hidden-coupling, long-horizon semantics     -> luna_worker
```

Use `deepseek_worker` (Flash) when speed, input volume, or cost is the main bottleneck and the objective, ownership, and acceptance are fixed. It is a general text-and-code worker, not only an extraction lane: use it for large-corpus reading, repository-wide analysis, structured reconciliation, focused diagnosis, and bounded implementation with explicit writable paths.

Use `spark_scout` only when the outcome is a bounded, independently verifiable, read-only evidence slice within its 128K context: locate entry points or call chains, compare a defined configuration set, classify a fixed log/test corpus, or return source-pinned facts that determine a later Sol decision. It uses `gpt-5.3-codex-spark` at `xhigh` with a read-only sandbox. It must return `CONCLUSION`, `EVIDENCE`, `UNCERTAINTY`, `BLOCKER`, and `NEXT CHECKS`. It must stop with a blocker for writes, context overflow, hidden coupling, architecture, release, risk-control, authorization, or a final verdict, and it must not delegate further.

Current Codex releases cannot deliver an OpenAI parent's encrypted V2 task payload to a non-OpenAI child. Until that upstream bug is fixed, DeepSeek Flash and Pro run only in **native full-request mode**: the current user request must itself be the complete assignment. Prefer `fork_turns="1"` when the client can combine it with the custom role. If that combination is rejected, the only permitted fallback is a native named-child initial `message` that reproduces the complete current user request verbatim as its sole task; it may not add, narrow, reinterpret, or privately supplement it. This remains a real Codex subagent with a child lifecycle and native tools, but it cannot receive a private Sol packet, reliable `send_message`, or reliable `followup_task`. If Sol must narrow, reinterpret, sequence, or privately supplement the user's request, keep the work with Sol or use Luna instead.

Use `deepseek_pro_worker` only after its separate route probe has passed. It is the balanced 1M-context lane for bounded work whose semantic density or likely retry cost is above Flash: multi-file behavior changes, difficult but isolated diagnosis, a deep first review of one PR, or a structured synthesis of conflicting evidence. Its profile uses `high` effort, not `max`; use Luna when hidden coupling or long-horizon semantics dominate. Do not choose Pro merely because the input is long, and do not use it for architecture, authorization, release, or external-state decisions.

Use `luna_medium_worker` when the work needs a native private task packet or concise native handoff, but its paths or sources, ownership, non-goals, and acceptance are already fixed. Good fits include a specified diff review, a named-module diagnosis with a target verifier, or a constrained implementation. If it discovers hidden coupling, an unresolved root cause, or a broader decision, it must stop and return a precise blocker; Sol decides whether to retain the work or issue a new Max packet.

Use `luna_worker` for Luna Max when the task benefits more from sustained deep reasoning than from latency: subtle code review, hidden cross-module coupling, difficult failure diagnosis, or long-horizon implementation. Max still needs explicit ownership and objective acceptance, but once dispatched it must be given time to finish.

When more than one worker could satisfy the same contract, choose Spark only for read-only evidence reconnaissance, Flash for context and throughput pressure, Pro for bounded high-judgment work whose expected rework justifies its incremental price, Luna Medium for a clear private packet, and Luna Max for deep semantic uncertainty. Do not duplicate the same packet merely to make workers vote. If evidence must precede implementation, use `worker evidence -> Sol decision -> worker implementation` only when the intermediate decision genuinely changes what will be built. If the named worker is unavailable or its effective route is unverified, keep the task with Sol or use another explicitly authorized lane. A profile on disk or a worker's self-report is not route proof.

## 2. DeepSeek 1M-context lanes

### Flash high-context fast lane

DeepSeek V4 Flash provides a 1M model context window. Use that capacity to avoid prematurely fragmenting material that can be understood more accurately as one coherent packet. High-value packets include:

- fixed webpages, papers, or long documents -> evidence matrix;
- large repositories or diffs -> architecture maps, call sites, configuration references, and repeated-pattern checks;
- CI output, logs, or incident records -> error classes, frequency, and timeline;
- issues, pull requests, or release notes -> deduplication, module grouping, and status extraction;
- CSV, JSON, or API snapshots -> reconciliation, missing records, and anomaly candidates;
- localization or dependency records -> missing keys, placeholder mismatches, version matches, and affected-file candidates;
- bounded multi-file analysis or implementation -> diagnosis, changes, and named verification inside explicit ownership.

### Pro balanced semantic lane

DeepSeek V4 Pro also provides a 1M model context window. Upgrade from Flash only when the input is not merely large but a more accurate first semantic pass is likely to avoid a full retry, extra handoff, or repeated context rebuild. High-value packets include:

- one isolated PR or diff -> deep first review with exact locations and a named verifier;
- a bounded multi-file behavioral change -> named paths, non-goals, and a target test;
- logs plus source -> competing, testable diagnosis hypotheses within one service boundary;
- a fixed source set with disagreement -> evidence matrix and reconciliation, not final policy judgment.

Both DeepSeek workers may make non-trivial local judgments needed to finish their packet. Architecture changes, source credibility, policy, authorization, release decisions, and final business judgment remain with Sol.

### Native web research

The supported official DeepSeek route exposes Codex's native `web_search` without a local bridge. Use it when search volume or webpage context is the bottleneck, while keeping the research judgment with Sol.

1. Sol confirms that the current user turn already defines the question, date range, source-quality bar, domain constraints, and required output. If it does not, DeepSeek full-request mode is ineligible.
2. DeepSeek performs bounded discovery and page reading with native `web_search`, records the exact URLs it used, and returns a compact evidence matrix. It must not silently widen the topic or replace requested primary sources with weaker commentary.
3. For a fixed source set already named in the current user turn, DeepSeek may read the URLs or local artifacts directly. If Sol first needs to discover, curate, or privately add the source set, that becomes a separate Sol step and is not eligible for full-request delegation.
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

Split only at independently verifiable outcome boundaries, not by file count or a desire to fan out. Under full-request mode, this section applies to Luna and to future DeepSeek versions with a repaired task channel; current DeepSeek may receive only the user's whole request.

1. Lock the parent contract: final objective, invariant facts, minimum acceptance criteria, and authorization boundary.
2. Keep ambiguity, architecture, priorities, tradeoffs, external mutations, and final semantic judgment with Sol.
3. Form one observable worker outcome with compact context and explicit, non-overlapping ownership.
4. Apply the independence test: can the chosen worker finish, verify, or return a precise blocker without redefining scope or changing another task's state?
5. Send one packet. On return, compare evidence with the parent contract and integrate it yourself.

## 4. Worker packet

Send only necessary context in this shape. Current DeepSeek full-request mode is the exception: do not pretend this private packet reaches it. Its assignment is the current user request (through supported turn inheritance or an exactly matching sole initial message), while the packet remains available for Luna and for DeepSeek after the upstream handoff is repaired.

```text
Worker and mode: spark_scout | deepseek_worker | deepseek_pro_worker | luna_medium_worker | luna_worker; read-only | write
Objective:
Scope and owned paths:
Relevant facts / source pins:
Non-goals:
Interfaces / invariants: <write packets: affected external contracts, or `none`>
Acceptance criteria:
Verification:
State-based stop condition:
Return format:
```

For any implementation packet, name writable paths and the affected `Interfaces / invariants` (or explicitly state `none`). DeepSeek and Luna may write only when ownership, acceptance, and approval are explicit. Spark is always read-only. An incomplete packet must produce an exact blocker, never a wider investigation. A stop condition must describe an outcome or blocker, not an elapsed-time limit.

## 5. Worker boundaries

- `spark_scout`: `gpt-5.3-codex-spark` / `xhigh` read-only evidence lane. It may inspect and return exact evidence only; it never writes, delegates, or owns architecture, policy, release, risk-control, account, authorization, or final decisions.
- `deepseek_worker`: fast 1M-context Flash general lane. In full-request mode it may analyze and implement only when the user's current request already grants that complete scope; it owns no parent architecture, policy, release, account, or authorization decision.
- `deepseek_pro_worker`: balanced 1M-context Pro lane for bounded, retry-expensive semantic work. It has the same full-request limitation and owns no parent architecture, policy, release, account, or authorization decision.
- `luna_medium_worker`: native Medium lane for a narrow private packet with fixed ownership and acceptance. It must return a blocker rather than broaden into hidden-coupling or architecture work.
- `luna_worker`: native Luna Max depth-first semantic lane. It owns the reasoning needed to finish its bounded packet, but no parent-goal, architecture, priority, release, or authorization change.
- Neither worker delegates further, changes external state, or performs unrelated cleanup.
- Do not plan a later DeepSeek follow-up while full-request mode is active; the current cross-provider message channel is not reliable.
- Pass later Luna workers only a concise handoff of facts, changes, verification, risks, and blockers—not a full transcript. A Medium blocker does not auto-upgrade itself; Sol selects any later Max packet explicitly.

## 6. Worker lease and interruption

A dispatched worker owns an execution lease until it returns a result or a state-based stop condition occurs. Long reasoning and the absence of commentary are normal, especially for Luna Max; do not treat a shorter Medium lane as a timeout budget.

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

### Independent review verdicts

Do not create a standing reviewer lane merely because review is useful. When an explicitly requested, fresh-context review is eligible, its only terminal verdict is one of `ship`, `fix-first`, or `rethink`.

- `ship`: the stated source/research contract passed; it never authorizes commit, push, merge, tag, release, deployment, account, or other external change.
- `fix-first`: named evidence requires a bounded correction before the contract can pass.
- `rethink`: the contract or approach is invalid enough that a local patch is not the right next action.

Any source change after a verdict invalidates that verdict. Do not carry it forward; request a new review only if its result would change the decision.

## 8. Parallelism and integrity

- Parallelism is optional. Use it only for independent scopes with disjoint write ownership.
- Start with at most two workers and depth one.
- Use at most one full-request DeepSeek worker (Flash or Pro) for the current user request. Do not manufacture hidden shards under full-request mode. Reconsider wider DeepSeek fan-out only after Codex repairs cross-provider dynamic task handoff.
- Run at most two Luna workers concurrently, only with disjoint ownership. Prefer one Luna worker for any write-bearing task.
- Shared mutable state, ordered dependencies, or overlapping writes are sequential.
- In one stage, exactly one producer owns each writable path. Sol may inspect, guide, and verify, but does not implement the same owned change in parallel with a dispatched Worker.
- Start at most one `spark_scout` for one evidence question; it is a single producer, not a vote. Dispatch the named `spark_scout`, `deepseek_worker`, `deepseek_pro_worker`, `luna_medium_worker`, or `luna_worker`, never a generic substitute. Re-check effective routing only after installation, a major client change, or observed mismatch.

### Sol reasoning posture

Where the client exposes a reasoning setting, recommend `gpt-5.6-sol` with `medium` effort for routine routing, packet construction, and integration. Escalate to `high` only for ambiguous architecture, conflicting evidence, high-stakes decisions, or complex cross-packet synthesis. The Skill describes this policy but cannot change the parent task's selected model or effort.

## 9. Installation and route recovery

When this workflow is being installed or a lane is unavailable, Sol owns the setup instead of sending the user away to edit Codex configuration:

1. Use `bash scripts/install.sh --lane-status` to inspect profile state. A user-authorized enable or disable is only `--enable-lane <lane|deepseek|all>` or `--disable-lane <lane|deepseek|all>`; after it succeeds, use a new task for Agent discovery. Do not treat a state change as a route probe.
2. Inspect the current `deepseek_worker` and its selected provider without printing secret material, then run one bounded task whose answer and acceptance are obvious. The supported upstream is the official DeepSeek API using `deepseek-v4-flash` and the separate candidate `deepseek-v4-pro`, the official model catalog, and their 1,048,576-token context windows.
3. Treat a successful real invocation as authoritative. Preserve the existing provider and credential mechanism exactly as it is; the absence of one environment variable, keychain item, command, or platform-specific backend is not failure evidence.
4. Only if the provider is absent or the invocation fails, inspect the current Codex client's supported provider and authentication interfaces. Configure only the selected DeepSeek provider and its credential reference using a mechanism native to that client and host environment. Never hard-code one operating system's credential store as the public workflow.
5. Confirm one direct text/tool result and one native `web_search` result. Test a third-party MCP namespace only when the workflow actually needs it; current native web acceptance does not depend on MCP.
6. Probe enabled `spark_scout` separately with a bounded read-only evidence task. Accept it only when the client shows the named child lifecycle and the required five-part return shape; it never needs a DeepSeek provider change.
7. If `spawn_agent` creates the custom-provider child but the child reports that no dynamic task payload arrived, classify the encrypted cross-provider handoff as blocked rather than reinstalling the provider or retrying `send_message` or `followup_task`.
8. If the current user request is itself a complete DeepSeek assignment, state the full-request assignment and acceptance boundary in the parent thread, then spawn the named `deepseek_worker` or route-probed `deepseek_pro_worker`. Prefer `fork_turns="1"` when accepted by the client. If the client rejects custom role plus turn inheritance, it may use `spawn_agent.message` only when that sole initial message is verbatim the complete current user request; the parent must state this fallback, and no private material may be added. Accept the route only when the child acts on that complete request and the client shows a real native child lifecycle. Any narrower or materially different `message` is untrusted.
9. If the current request requires private decomposition, narrower ownership, later instructions, or a different objective, do not use DeepSeek full-request mode. Keep the work with Sol or route an eligible packet to Luna. Never label a direct API request, `codex exec` process, bridge, or separate first-class task as a DeepSeek subagent.
10. OpenCode Go remains unsupported until it exposes the Codex Responses and tool contract directly. Do not install LiteLLM, a Responses-to-Chat bridge, or the alternate Go Worker profile.
11. If a different provider block already exists, diagnose the actual invocation before proposing a change. Do not overwrite a working custom setup. Never request a key in chat or place it directly in `config.toml`.
12. If the current task cannot discover a newly installed agent, ask the user only to start a new task, then run the probe automatically. Reopen the App only if discovery still fails.

Outside a repository installation, configuration mutation still requires explicit user authorization. The user may need to approve the change and enter a credential through a secure prompt, but must not be asked to discover the provider schema or installation steps.
