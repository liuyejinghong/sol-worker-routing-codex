---
name: github-review-handoff
description: Coordinate developers and GPT-5.6 Pro independent reviewers through durable GitHub Issue and PR records, exact commit identities, structured handoffs, verdicts, and correction loops. Use when a change needs an independent GitHub review; do not use for an ordinary local code review with no cross-party handoff.
---

# GitHub review handoff

## Outcome

Make GitHub the durable source of truth for independent review. Chat, browser conversations, email, and other channels may notify or clarify, but every actionable finding, response, exact review target, and terminal verdict must be recorded on the owning Issue or PR.

This skill coordinates the workflow; it does not grant permission to push, comment, merge, close, release, deploy, or mutate external systems.

## GPT-5.6 Pro independent-review lane

Use this lane when the user requests an independent GPT-5.6 Pro review. It is a separate reviewer conversation, not a child-Agent role or a second pass by the current Codex context; its review does not consume the current Codex task's quota.

1. Reuse the user-designated GPT-5.6 Pro conversation, or open one through an available separate-model or browser entrypoint. This Skill does not itself create a model route. If no such entrypoint or conversation is available, report that the review was not launched; do not silently substitute the current Codex agent.
2. For a public repository, give the GPT-5.6 Pro reviewer the repository, Issue, or PR URL plus the exact base and review-head SHA; it can read the linked public project directly.
3. For a private repository, the user must manually connect the GPT-5.6 Pro review conversation to GitHub and grant that connector access to the specific repository before it can read or write. Do not request credentials, tokens, emails, or connector secrets.
4. Send a compact review packet: repository URL, owning Issue or PR, base SHA, exact review-head SHA, requested focus, existing findings and dispositions, required GitHub `@mention` recipient when applicable, and the requested terminal verdict.
5. Require the GPT-5.6 Pro reviewer to write findings and its verdict to the owning GitHub Issue or PR. A chat-only response is coordination input, not a completed independent review.

## Establish the review contract

Before acting:

1. Read repository instructions and the owning Issue, PR body, review threads, checks, linked branches, and current source.
2. Identify the current role: developer, reviewer, or authorized maintainer. Do not combine roles merely because one agent can perform them.
3. Record the repository, base branch, relevant baseline commit if one exists, current PR head SHA, and linked Issue. A verdict applies only to the reviewed head.
4. Separate source review, merge, release, deployment, and production acceptance. Approval of one does not imply the others.
5. Verify an older report against the current base before implementing it. If the finding is already fixed or false, submit precise counter-evidence instead of manufacturing a change.

## Use one durable thread per responsibility

- The Issue owns the problem statement, root cause, user or system impact, acceptance criteria, and final lifecycle.
- The PR owns the proposed change, exact diff, implementation evidence, review findings, correction replies, and source verdict.
- Prefer one root cause per branch and PR. Combine issues only when the code and verification cannot be separated without breaking the owning invariant, and state why.
- Do not rewrite historical audit reports or old review comments. Add a new linked follow-up record.
- Keep the Issue open while required source changes remain unmerged. Use the repository's normal Issue-closing mechanism after the accepted PR lands.

## Notification routing

Use GitHub `@mentions` as a delivery cue for a durable GitHub handoff, never as a substitute for the Issue, PR, exact head, or verdict record.

Resolve these optional values for each handoff from the user or the repository's documented review contract:

- `reviewer_mentions`: one or more GitHub `@handles` to notify for an initial review or re-review request.
- `owner_mentions`: one or more GitHub `@handles` to notify when a reviewer opens an Issue or posts a finding that needs triage or a fix.
- `notification_reason`: one short, human-readable reason for the mention.

Use the field that matches the direction of the handoff. Put the configured mentions and reason at the first non-title line of the new Issue, review-request comment, reviewer finding, or re-review request. Do not hard-code a handle, infer one from a name or email address, or mention a person merely because they participated previously.

Do not repeat a mention on ordinary status replies. If the user requires notification but the correct recipient handle is not configured, stop before the external write and ask for it. If notification is not required, omit the mention rather than inserting a placeholder.

### Native email notification intake

For a handoff that should notify a person through GitHub's native email notifications, collect only the inputs that determine the durable record and its recipient:

- repository URL;
- `owner_mentions` for the person who should receive a new finding;
- `reviewer_mentions` for the person who should receive an initial or re-review request; and
- the Issue or PR URL plus exact review head when a review is actually requested.

A GitHub `@handle` is a user-provided account identifier, not an authentication secret. Do not request or store the recipient's email address, personal access token, connector credential, webhook secret, or a persistent account mapping. If the user gives one handle for themselves and wants notification of new findings, use it as `owner_mentions`; do not silently reuse it as `reviewer_mentions`.

GitHub sends native email according to the recipient's own notification settings. Tell the recipient to enable email for participating notifications in GitHub, but do not try to change account settings or claim delivery without an authorized real GitHub mention. A repository URL and handle identify the handoff; they neither start a review nor grant repository read/write access.

### Same-account automation and native relay

An independent reviewer model and a distinct GitHub writer identity are different things. If the reviewer writes through the recipient's own GitHub connector, a self-created Issue and self-`@mention` are not evidence that an incoming review notification will reach that person's email. For a normal cross-account handoff, keep the direct `@mention` route.

When the writer and recipient are the same GitHub account and native email must reliably wake that account, an authorized maintainer may opt into the small GitHub Actions relay in [references/github-actions-notifier.md](references/github-actions-notifier.md). It posts one deliberate notification comment from the repository's GitHub Actions identity when a newly opened handoff Issue includes the explicit relay marker.

- This is optional: do not add it merely because a reviewer uses a separate model.
- It needs only a repository workflow and separate authorization to commit and push that workflow. It does not require a webhook, email provider, label, PAT, connector secret, or persistent account mapping.
- When enabled, put `<!-- github-review-handoff: native-email-relay -->` directly below the first-line user-provided mentions in the new Issue. The relay repeats that exact first line once as an intentional delivery event, not an ordinary status reply.
- A successful Action run proves only that the cross-identity GitHub event was created. The recipient must still confirm inbox delivery; if it is absent, inspect GitHub's participating-email setting and verified destination before creating more test Issues.

## Developer workflow

1. Reproduce or otherwise prove the reachable failure on the current base.
2. Implement the smallest complete root-cause fix on a dedicated branch, preserving the canonical owner and source of truth.
3. Push the branch and open or update the PR using the developer templates in [references/github-templates.md](references/github-templates.md).
4. Request review with the exact head SHA and configured `reviewer_mentions` when notification is required. Include real test commands and results, tests not run, residual risk, and contract boundaries.
5. Mirror a concise handoff in the Issue so its readers can find the PR and current review state.
6. For every reviewer finding, reply on its owning PR thread with exactly one disposition:
   - `FIXED`: identify the new head, changed symbols, and verification.
   - `REJECTED_WITH_EVIDENCE`: provide direct code, test, protocol, or runtime evidence.
   - `NEEDS_MORE_EVIDENCE`: state the missing fact and the bounded next check.
7. After pushing corrections, request re-review of the new exact head. Do not treat an approval of an older head as current.

## Reviewer workflow

1. Review the exact requested head against the stated base and Issue contract, not an unspecified moving branch.
2. Check the real caller, state owner, external side effects, persistence, recovery, and supported equivalent entry points in proportion to the change.
3. Put each actionable finding on the PR with a reachable failure chain, evidence location, broken invariant, and acceptance condition. Use configured `owner_mentions` only when the finding needs a responsible party's attention. Follow repository severity conventions when they exist; do not invent a scoring system merely to make the review look formal.
4. Distinguish defects from questions, suggestions, and missing evidence. Do not block on unrelated cleanup.
5. Finish with one source verdict tied to the exact head:
   - `APPROVE_SOURCE`
   - `REQUEST_CHANGES`
   - `NEEDS_MORE_EVIDENCE`
6. State separate non-source boundaries such as `RELEASE_NOT_REVIEWED`, `DEPLOYMENT_NOT_REVIEWED`, or equivalent project language when relevant.
7. On re-review, link each prior blocking finding and mark it closed, still open, or superseded. Record new findings separately.

## Maintainer merge and closure

Merge only with explicit authority and only when the approved head still matches the PR head and required repository checks are satisfied. Record the merge commit and resulting Issue state. Never infer release, deployment, production validation, or runtime permission from a merged PR.

## External reviewer channel

When an independent reviewer is reached through a browser or separate model conversation:

- Reuse the user-designated existing project and conversation when one is provided; do not create a new project or session unless asked.
- A public repository can be reviewed from its repository, Issue, or PR link. Before reading or writing a private repository, confirm that the reviewer's manually connected GitHub connector has access to that specific repository; do not request or handle credentials.
- Send a compact notification containing GitHub links, old and new exact heads, finding dispositions, and the requested verdict. Do not paste a second authoritative review record into chat.
- Ask the reviewer to write the durable verdict and findings back to the relevant GitHub PR.
- Treat a chat-only verdict as coordination input, not merge or closure evidence, until it appears on GitHub.
- Mirror any substantive clarification back to the owning Issue or PR.

## Templates

Read [references/github-templates.md](references/github-templates.md) when creating an Issue, PR, developer handoff, reviewer verdict, correction reply, re-review request, or merge record. Localize headings and prose to the user's or repository's language while preserving the fields and exact identifiers.

## Stop conditions

Stop and report rather than guessing when the repository, Issue, PR, base, head SHA, review authority, or mutation authorization is unresolved. Stop expanding the workflow once the durable GitHub record contains the exact target, evidence, dispositions, and current verdict.
