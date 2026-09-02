# Full-Spectrum Review

A multi-axis review Skill for AI coding agents.

Instead of asking one reviewer to do everything at once, it separates review into three independent questions:

| Axis | Question |
|---|---|
| Engineering | Is the implementation correct, safe, reliable, and well integrated? |
| Business Logic | Does the implemented behavior correctly represent the intended domain reality? |
| Optimization & Simplification | Can the same required behavior be delivered with less code, state, cost, complexity, and failure surface? |

The axes generate candidates independently, then share one evidence and finding-verification protocol.

## Why separate the axes?

A correctness reviewer often recommends adding guards. An optimization reviewer should be allowed to ask whether the guard is compensating for a bad ownership model. A business reviewer may then establish the domain invariant both designs must preserve.

Keeping these passes independent reduces anchoring and produces genuinely different review perspectives.

## Suggested prompts

### Full review

```text
Use the full-spectrum-review Skill to review PR #123.
Run Engineering, Business Logic, and Optimization/Simplification as independent passes, then verify and deduplicate findings. Bind the verdict to the exact PR head.
```

### Business-only audit

```text
Use full-spectrum-review in Business Logic mode.
Reconstruct the domain rules and invariants before judging the implementation. Focus on business-semantic mismatches rather than code style.
```

### Optimization-only audit

```text
Use full-spectrum-review in Optimization & Simplification mode.
Preserve required behavior. Prioritize deleting duplicated state, responsibility, recovery machinery, and redundant work over adding new abstractions or micro-optimizations.
```

### Real-money trading system

```text
Use full-spectrum-review with the trading-domain pack. Review the exact commit for engineering correctness, business semantics, and behavior-preserving simplification. Treat unknown exchange/order state as something that requires reconciliation rather than an implicit success/failure.
```

## Skill layout

```text
full-spectrum-review/
├── SKILL.md
├── README.md
└── references/
    ├── engineering-review.md
    ├── business-logic-review.md
    ├── optimization-review.md
    ├── finding-protocol.md
    └── trading-domain.md
```

## Design principles

- Specialized passes beat one giant checklist.
- Spec/domain reconstruction comes before implementation judgment.
- Candidate generation favors recall; durable findings require evidence.
- Tests are evidence, not proof.
- Changed lines are the starting point, not the reasoning boundary.
- Reachable failures matter; merely constructible hypotheticals do not.
- Optimization must preserve required behavior and account for transferred responsibilities.
- Deleting a source of truth or an unnecessary subsystem can be a larger reliability win than a local performance tweak.
- PR verdicts should be exact-head-bound when possible.

## License

This Skill follows the license of the parent repository.