#!/usr/bin/env python3
"""Configure the DeepSeek Codex provider without exposing its API key."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
import tomllib
from datetime import datetime
from pathlib import Path


KEYCHAIN_ACCOUNT = "codex"
KEYCHAIN_SERVICE = "com.openai.codex.deepseek-api-key"
SECURITY = Path("/usr/bin/security")
AUTH_ARGS = [
    "find-generic-password",
    "-a",
    KEYCHAIN_ACCOUNT,
    "-s",
    KEYCHAIN_SERVICE,
    "-w",
]
EXPECTED_PROVIDER = {
    "name": "DeepSeek",
    "base_url": "https://api.deepseek.com/v1",
    "wire_api": "responses",
    "auth": {
        "command": str(SECURITY),
        "args": AUTH_ARGS,
        "timeout_ms": 5000,
    },
}
PROVIDER_BLOCK = f'''[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/v1"
wire_api = "responses"
auth = {{ command = "{SECURITY}", args = ["{'", "'.join(AUTH_ARGS)}"], timeout_ms = 5000 }}
'''


def codex_config_path() -> Path:
    configured_home = os.environ.get("CODEX_HOME")
    codex_home = Path(configured_home).expanduser() if configured_home else Path.home() / ".codex"
    if not codex_home.is_absolute():
        raise ValueError(f"Codex home must be absolute: {codex_home}")
    return codex_home / "config.toml"


def load_config(config_path: Path) -> tuple[str, dict]:
    if not config_path.exists():
        return "", {}
    if config_path.is_symlink() or not config_path.is_file():
        raise ValueError(f"Config must be a regular file, not a symbolic link: {config_path}")
    original = config_path.read_text(encoding="utf-8")
    return original, tomllib.loads(original)


def provider_state(config: dict) -> str:
    provider = config.get("model_providers", {}).get("deepseek")
    if provider is None:
        return "missing"
    if provider == EXPECTED_PROVIDER:
        return "ready"
    return "conflict"


def keychain_has_credential() -> bool:
    result = subprocess.run(
        [str(SECURITY), *AUTH_ARGS],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return result.returncode == 0


def ensure_keychain_credential() -> None:
    if not SECURITY.is_file():
        raise RuntimeError("Automatic credential setup currently requires macOS Keychain.")
    if keychain_has_credential():
        print(f"Verified: DeepSeek credential exists in macOS Keychain ({KEYCHAIN_SERVICE}).")
        return
    if not sys.stdin.isatty():
        raise RuntimeError(
            "DeepSeek credential is missing. Re-run bash scripts/install.sh in an interactive "
            "terminal so the installer can open a hidden API-key prompt. Do not paste the key into chat."
        )
    print("DeepSeek API key is missing. Enter it at the hidden macOS Keychain prompt.")
    subprocess.run(
        [
            str(SECURITY),
            "add-generic-password",
            "-U",
            "-a",
            KEYCHAIN_ACCOUNT,
            "-s",
            KEYCHAIN_SERVICE,
            "-w",
        ],
        check=True,
    )
    if not keychain_has_credential():
        raise RuntimeError("The DeepSeek credential was not available after the Keychain prompt.")
    print(f"Installed: DeepSeek credential in macOS Keychain ({KEYCHAIN_SERVICE}).")


def install_provider(config_path: Path, original: str) -> None:
    config_path.parent.mkdir(parents=True, exist_ok=True)
    separator = "" if not original or original.endswith("\n\n") else ("\n" if original.endswith("\n") else "\n\n")
    updated = f"{original}{separator}{PROVIDER_BLOCK}"

    backup_path: Path | None = None
    if config_path.exists():
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        backup_path = config_path.with_name(f"config.toml.sol-worker-routing-{timestamp}.bak")
        shutil.copy2(config_path, backup_path)

    file_mode = config_path.stat().st_mode & 0o777 if config_path.exists() else 0o600
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=config_path.parent,
        prefix=".config.toml.",
        delete=False,
    ) as handle:
        temporary_path = Path(handle.name)
        handle.write(updated)
    os.chmod(temporary_path, file_mode)
    os.replace(temporary_path, config_path)

    _, verified = load_config(config_path)
    if provider_state(verified) != "ready":
        raise RuntimeError(f"DeepSeek provider verification failed after writing {config_path}")
    print(f"Installed: DeepSeek provider in {config_path}")
    if backup_path:
        print(f"Backup: {backup_path}")


def main() -> int:
    try:
        config_path = codex_config_path()
        original, config = load_config(config_path)
        state = provider_state(config)
        if state == "conflict":
            raise RuntimeError(
                "A different [model_providers.deepseek] configuration already exists at "
                f"{config_path}. Nothing was changed."
            )

        ensure_keychain_credential()
        if state == "missing":
            install_provider(config_path, original)
        else:
            print(f"Verified: DeepSeek provider already matches the workflow in {config_path}")
        return 0
    except (OSError, RuntimeError, ValueError, tomllib.TOMLDecodeError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
