# GitHub review templates

Use only the template needed for the current action. Adapt labels to repository conventions, but retain exact links, SHAs, commands, and outcomes.

## Native email notification intake

When the user wants GitHub to email a recipient through an `@mention`, collect this small per-handoff record before creating the Issue or review comment:

```text
Repository: <GitHub repository URL>
Notify owner for a new finding: @<owner handle>
Notify reviewer for review or re-review: @<reviewer handle>
Review target when applicable: <Issue/PR URL and exact head SHA>
```

The recipient manually enables email for participating notifications in their GitHub account. A GitHub handle is enough for the mention; do not request an email address, token, webhook URL, or other credential. Use only the role that applies to this handoff, and omit unused roles.

## Notification fields

Use an `@mention` only when the handoff contract supplies the correct GitHub handle. The mention is a notification; GitHub remains the durable record.

| Field | Use it for | Where it goes |
|---|---|---|
| `owner_mentions` | A new Issue or reviewer finding needs triage or a fix | First non-title line of the Issue/finding |
| `reviewer_mentions` | An independent review or re-review is requested | First non-title line of the request |
| `notification_reason` | A concise reason for the recipient | Immediately below the mention |

Use one or more explicit GitHub `@handles` separated by spaces. Do not infer a handle from a display name or email address. If notification is required but the applicable field is absent, ask for it before creating the GitHub record. Do not repeat the mention on ordinary progress replies.

## Issue body

```markdown
@<owner_mentions>

> Notification: <notification_reason, for example: an external review finding requires triage>

## Problem
<observable failure and affected user/system>

## Root cause
<first broken invariant and owning component>

## Reachable failure chain
<entry -> validation/authorization -> state -> side effect -> persistence/recovery>

## Acceptance criteria
- <observable condition>
- <required failure or retry behavior>
- <required side-effect count or idempotency condition>

## Baseline and current status
- Reported baseline: `<commit or unknown>`
- Current base checked: `<branch>@<sha>`
- Current result: `CONFIRMED` / `ALREADY_FIXED` / `REJECTED_WITH_EVIDENCE` / `NEEDS_MORE_EVIDENCE`

## Non-goals and authorization boundary
<what this issue does not authorize>
```

## Pull request body

```markdown
Closes #<issue>

## Root cause
<why the failure existed>

## Original failure chain
<the concrete path to the wrong outcome>

## Fix
<how the canonical owner now preserves the invariant>

## Why this is the smallest complete fix
<necessary causal scope and excluded adjacent work>

## Files and symbols
- `<path>` — `<symbol>`: <change>

## Verification performed
- `<exact command>` -> `<actual result>`

## Verification not performed
- <command/scope and reason>

## Retry, recovery, and side effects
<idempotency, response-loss, restart, equivalent-entry, and side-effect evidence as applicable>

## Residual risk
<remaining uncertainty, or `None identified within source scope`>

## Contract impact
- Source/runtime areas: <affected and unaffected areas>
- Release/deployment/production: `NOT_PERFORMED` unless separately evidenced
```

## Developer review handoff comment

```markdown
@<reviewer_mentions>

> Notification: <notification_reason, for example: independent review requested for the exact head below>

请求独立复审。

- Issue: #<issue>
- PR: #<pr>
- Base reviewed against: `<branch>@<sha>`
- Review target head: `<full sha>`
- Previous reviewed head: `<full sha or none>`

Changes since the previous review:
- <finding link or identifier> -> `FIXED` / `REJECTED_WITH_EVIDENCE` / `NEEDS_MORE_EVIDENCE`: <one-line evidence>

Verification:
- `<exact command>` -> `<actual result>`

Not run / boundaries:
- <not run>
- No release, deployment, production, or other out-of-scope mutation was performed.

Requested durable GitHub verdict on this exact head: `APPROVE_SOURCE` / `REQUEST_CHANGES` / `NEEDS_MORE_EVIDENCE`.
```

## Reviewer finding and verdict

```markdown
@<owner_mentions>

> Notification: <notification_reason, for example: this review finding requires triage>

Reviewed head: `<full sha>`
Base: `<branch>@<sha>`

### Finding: <concise title>

- Classification: <repository severity if applicable, otherwise blocking/non-blocking>
- Evidence: `<path>:<line or symbol>` and <test/protocol/runtime evidence>
- Reachable failure chain: <supported entry to observable failure>
- Broken invariant: <single invariant>
- Required acceptance: <observable condition that closes the finding>
- Scope boundary: <what is not required>

### Source verdict

`APPROVE_SOURCE` / `REQUEST_CHANGES` / `NEEDS_MORE_EVIDENCE`

Verdict applies only to `<full sha>`.

### Separate boundaries

- Merge: `NOT_DECIDED` unless the reviewer is also an authorized maintainer
- Release: `NOT_REVIEWED`
- Deployment/production: `NOT_REVIEWED`
```

For multiple findings, repeat the finding block and keep one terminal verdict for the exact head.

## Developer finding response

```markdown
Reply to: <finding permalink>

Disposition: `FIXED` / `REJECTED_WITH_EVIDENCE` / `NEEDS_MORE_EVIDENCE`
Current head: `<full sha>`

- Code evidence: `<path>:<symbol>` — <explanation>
- Verification: `<exact command>` -> `<actual result>`
- Remaining boundary: <none or precise unresolved fact>
```

## Re-review request

```markdown
@<reviewer_mentions>

> Notification: <notification_reason, for example: re-review requested for the new head below>

请求复审新 head `<full sha>`；上一轮 head 为 `<full sha>`。

- <prior finding permalink> -> <disposition and evidence>
- Diff since prior head: `<comparison link or old...new>`
- Focused verification: `<command>` -> `<result>`
- Not run / remaining risk: <precise statement>

请把针对新 head 的结论写回本 PR。
```

## Merge and Issue closure record

```markdown
- Approved source head: `<full sha>`
- Approval permalink: <URL>
- Merge commit: `<full sha>`
- Required checks: <actual status>
- Issue: #<issue> -> <closed automatically / closed explicitly / remains open with reason>
- Release/deployment/production: `NOT_PERFORMED` unless separately authorized and evidenced
```
