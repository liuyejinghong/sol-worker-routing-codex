"""Repair Chat tool-message ordering after LiteLLM's Responses bridge.

LiteLLM 1.96 only runs its tool-result repair helper for
``previous_response_id`` sessions. Codex sends the complete Responses input
history instead, so an assistant ``tool_calls`` message can reach OpenCode Go
without all matching tool messages immediately following it.

This callback operates on the already-transformed Chat messages. It does not
log or persist prompts, arguments, tool output, or credentials.
"""

from __future__ import annotations

import json
import os
from typing import Any

import litellm
from litellm.integrations.custom_logger import CustomLogger


def _value(item: Any, key: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(key, default)
    return getattr(item, key, default)


def _tool_call_ids(message: Any) -> list[str]:
    ids: list[str] = []
    for tool_call in _value(message, "tool_calls", None) or []:
        call_id = _value(tool_call, "id", None)
        if call_id:
            ids.append(str(call_id))
    return ids


def normalize_tool_pairs(messages: list[Any]) -> None:
    """Move complete Chat tool results directly behind their assistant call.

    OpenCode Go rejects a Chat request when an assistant message contains N
    tool calls but the immediately following tool messages do not answer all N
    IDs. Responses histories may contain assistant status messages between the
    call and results, so relocate matching tool messages without changing their
    contents. Incomplete exchanges are left untouched for the provider to
    reject explicitly.
    """

    index = 0
    while index < len(messages):
        message = messages[index]
        expected_ids = _tool_call_ids(message) if _value(message, "role") == "assistant" else []
        if not expected_ids:
            index += 1
            continue

        matches: dict[str, Any] = {}
        matched_indexes: list[int] = []
        scan_index = index + 1
        while scan_index < len(messages):
            candidate = messages[scan_index]
            role = _value(candidate, "role", None)
            if role in ("user", "developer", "system"):
                break
            if role == "assistant" and _tool_call_ids(candidate):
                break
            if role == "tool":
                candidate_id = _value(candidate, "tool_call_id", None)
                if candidate_id and str(candidate_id) in expected_ids:
                    matches[str(candidate_id)] = candidate
                    matched_indexes.append(scan_index)
            scan_index += 1

        if all(call_id in matches for call_id in expected_ids):
            for matched_index in reversed(matched_indexes):
                messages.pop(matched_index)
            messages[index + 1 : index + 1] = [matches[call_id] for call_id in expected_ids]
            index += 1 + len(expected_ids)
        else:
            index += 1


def _message_shape(messages: list[Any]) -> list[dict[str, Any]]:
    shape: list[dict[str, Any]] = []
    for message in messages:
        shape.append(
            {
                "class": type(message).__name__,
                "type": _value(message, "type", None),
                "role": _value(message, "role", None),
                "id": _value(message, "id", None),
                "call_id": _value(message, "call_id", None),
                "name": _value(message, "name", None),
                "tool_call_ids": _tool_call_ids(message),
                "tool_call_id": _value(message, "tool_call_id", None),
            }
        )
    return shape


class OpenCodeGoToolPairingCallback(CustomLogger):
    def log_pre_api_call(self, model: str, messages: list[Any], kwargs: dict[str, Any]) -> None:
        # Loading this callback installs the outgoing Chat normalization below.
        return None


opencode_go_tool_pairing = OpenCodeGoToolPairingCallback()


if not getattr(litellm, "_opencode_go_tool_pairing_installed", False):
    _original_acompletion = litellm.acompletion

    async def _opencode_go_acompletion(*args: Any, **kwargs: Any) -> Any:
        messages = kwargs.get("messages")
        if kwargs.get("_skip_responses_api_bridge") and isinstance(messages, list):
            debug_shapes = os.environ.get("OPENCODE_GO_BRIDGE_DEBUG_SHAPES") == "1"
            if debug_shapes:
                print("OpenCode Go Chat shape before: " + json.dumps(_message_shape(messages)))
            normalize_tool_pairs(messages)
            if debug_shapes:
                print("OpenCode Go Chat shape after: " + json.dumps(_message_shape(messages)))
        return await _original_acompletion(*args, **kwargs)

    litellm.acompletion = _opencode_go_acompletion
    litellm._opencode_go_tool_pairing_installed = True
