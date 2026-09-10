---
name: opencode-worker
description: Delegate bounded authorized work to local OpenCode and the user's OpenCode Go subscription through an explicit OMO profile. Prefer one foreground run call, inspect its result, continue the same session, or cancel. Codex retains judgment and acceptance. Do not use for native Codex subagents or unapproved external work.
---

# OpenCode Worker

Discover this plugin's callable MCP tools. Use the selected OMO profile (default `codex-worker`) as the model mapping. All agents, categories and auxiliary requests must use each model's highest supported reasoning. Check actual role/category/model receipts, not the Sisyphus or Junior label alone. Do not silently switch Provider or model. Contributor permits training on submitted inputs and outputs. Follow existing external-use authorization without repeating confirmations already given.

Keep requirements, scope, integration and acceptance with Codex. Reuse the host workflow's bounded packet and file-ownership rules. This skill defines the execution contract, not a second routing policy.

## Default: one foreground run

Use `run` with the assigned absolute directory, task, mode, exact writable paths, trusted commands, stable request_id and `wait_seconds: 300`. It performs setup and program-side waiting; no preliminary status/start/wait sequence is needed. Use status only to diagnose availability, answer a user query, or recover a known task.

If the call goes through Code Mode `functions.exec`, put `// @exec: {"yield_time_ms":360000}` on the first line so the wrapper covers the wait window with margin. Merely extending the MCP wait does not prevent an outer wrapper from yielding early. Avoid periodic progress messages or empty checks while the tool is pending. Direct MCP clients do not need a Code Mode setting.

The waiting window is finite. `wait_expired=true` and `finished=false` mean execution may still be running. Repeat run with the same request_id and identical task parameters to await that existing task, or use wait. Never create a new ID as a retry of an uncertain submission. Do not end the main response with an unfinished task unless another supported followup is actually bound or the user has chosen manual followup.

`completed` means the worker stopped, not that Codex accepted its work. Inspect real artifacts, actual checks, tool errors and scope before delivery. Do not rely on the worker's final prose alone.

For a correction, call followup with a new request_id and `wait_seconds: 300`. It keeps the OpenCode session, original permissions and routing. A changed profile requires explicit handling rather than silently rebinding an existing task. Old request IDs refer to their own archived turn, not a newer correction.

## Background, interruption and recovery

Use start only for explicitly intended background/manual operation. It returns immediately and does not register a completion wakeup. An MCP notification or a file on disk is not proof that an ended Codex conversation will resume.

Cancelling an RPC wait stops waiting, not the worker. Use cancel when the user wants execution stopped, then confirm finished=true before transferring file ownership. Preserve edits. An unknown unfinished task requires recovery, not another writer. A wait timeout alone does not justify cancelling or duplicating work.

The plugin supports one active task. It runs Sisyphus with at most two direct child tasks. Only configured categories and read-only specialists may be delegated; category tasks are foreground, with one writer at a time. No further child delegation, arbitrary skills, external tools or Team Mode. Wait for all children and the root's synthesis before completion. `model_mode=single` disables delegation and uses the primary model for all calls. Read-only mode has no shell. OpenCode does not inherit Codex's sandbox or context; trusted exact commands run under the user's local account and are not an OS filesystem sandbox.

Do not broaden permissions to get around a denial. Commit, push, release, deployment or other external mutations require their own authorization. Return the result and meaningful limits; do not equate cumulative conversation tokens with monitoring cost, or unavailable quota with zero usage.
