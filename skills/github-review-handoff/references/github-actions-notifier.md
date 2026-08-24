# Optional native GitHub Actions notification relay

Use this only when an automated reviewer writes GitHub records through the same account that needs to be notified. A model can be independent while its GitHub writer identity is still the recipient's account; a self-`@mention` is therefore not a reliable email-delivery test.

The relay keeps GitHub as the only service. A repository Action posts one notification comment as the GitHub Actions App when a new Issue contains an explicit, invisible relay marker. It does not replace the original Issue, exact review target, findings, or verdict.

## One-time repository setup

1. Commit the workflow below as `.github/workflows/review-handoff-notify.yml`. This is a repository change and needs its own commit/push authorization. If GitHub Actions is disabled for the repository, enable it manually first.
2. In the recipient's GitHub notification settings, enable **Email** under **Participating** and choose a verified default notification address.

```yaml
name: Relay review-handoff notification

on:
  issues:
    types: [opened]

permissions:
  issues: write

jobs:
  notify-owner:
    if: "${{ contains(github.event.issue.body, '<!-- github-review-handoff: native-email-relay -->') }}"
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ github.token }}
      GH_REPO: ${{ github.repository }}
      ISSUE_NUMBER: ${{ github.event.issue.number }}
      ISSUE_BODY: ${{ github.event.issue.body }}
    steps:
      - name: Post the one delivery comment
        shell: bash
        run: |
          mentions="$(printf '%s\n' "${ISSUE_BODY}" | sed -n '1p')"
          if [[ "${mentions}" != @* ]]; then
            echo "The first Issue line must contain the configured @mention." >&2
            exit 1
          fi

          body="$(printf '%s\n\n> Notification: this review handoff needs your attention.' "${mentions}")"
          gh issue comment "${ISSUE_NUMBER}" --body "${body}"
```

The workflow receives only `issues: write`, has no checkout, does not execute Issue text, and does not start another workflow when its comment is created. GitHub's `GITHUB_TOKEN` is a repository-scoped installation token for the Actions GitHub App.

## Handoff and test

Place the marker immediately below the normal first-line owner mention in the new Issue:

```markdown
@<owner_mentions>

<!-- github-review-handoff: native-email-relay -->

> Notification: <notification_reason>
```

- The first line is the same user-provided, configurable `@mention` used by the durable Issue record. The Action repeats it once from the Actions identity; it does not need a repository variable or label.
- The marker is opt-in. Issues without it neither receive a bot comment nor create a notification relay event.
- For a first test, create one clearly marked notification-test Issue with the marker. Confirm that one Actions comment appears from the Actions identity, then have the recipient confirm the email. Do not create repeated test Issues while waiting.
- If the email does not arrive, the missing fact is account delivery configuration or mail filtering, not the Issue format. Check the participating Email selection and verified destination before rerunning.
