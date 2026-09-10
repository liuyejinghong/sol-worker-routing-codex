"""Run installation and interruption regressions in disposable homes.

INSTALL_TEST_BASH=/path/to/bash python3 tests/test_install.py
"""
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASH = os.environ.get("INSTALL_TEST_BASH", "/bin/bash")
LANES = ("luna-medium-worker", "luna-worker")


def snapshot(home):
    return {str(p.relative_to(home)): p.read_bytes()
            for p in home.rglob("*") if p.is_file()}


def run(home, args=(), fault=None):
    env = dict(os.environ, SOL_WORKER_ROUTING_TEST_HOME=str(home))
    env.pop("CODEX_HOME", None)
    if fault:
        env.update(fault)
    return subprocess.run([BASH, str(ROOT / "scripts/install.sh"), *args],
                          env=env, text=True, capture_output=True, timeout=30)


def setup(home, mode):
    if mode == "fresh":
        return (), (False, False)
    if mode == "upgrade":
        for name, off in zip(LANES, (False, True)):
            path = home / ".codex/agents" / (name + ".toml" + (".disabled" if off else ""))
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(subprocess.check_output(
                ["git", "show", f"v0.12.3:agents/{name}.toml"], cwd=ROOT))
        skill = home / ".agents/skills/sol-worker-routing/SKILL.md"
        skill.parent.mkdir(parents=True)
        skill.write_bytes(subprocess.check_output(
            ["git", "show", "v0.12.3:skills/sol-worker-routing/SKILL.md"], cwd=ROOT))
        (home / ".codex/agents/spark-scout.toml").write_bytes(subprocess.check_output(
            ["git", "show", "v0.10.0:agents/spark-scout.toml"], cwd=ROOT))
        return (), (False, True)
    assert run(home).returncode == 0
    if mode == "enable":
        assert run(home, ("--disable-lane", "all")).returncode == 0
        return ("--enable-lane", "all"), (False, False)
    return ("--disable-lane", "all"), (True, True)


def verify(home, disabled):
    for name, off in zip(LANES, disabled):
        base = home / ".codex/agents" / (name + ".toml")
        target = Path(str(base) + ".disabled") if off else base
        other = base if off else Path(str(base) + ".disabled")
        assert target.read_bytes() == (ROOT / "agents" / (name + ".toml")).read_bytes()
        assert not other.exists()
    assert (home / ".agents/skills/sol-worker-routing/SKILL.md").read_bytes() == (
        ROOT / "skills/sol-worker-routing/SKILL.md").read_bytes()
    assert not (home / ".codex/agents/spark-scout.toml").exists()
    assert not [p for p in home.rglob("*") if p.is_file() and ".install" in p.name]


def wrappers(root):
    directory = root / "bin"
    directory.mkdir()
    for command in ("mv", "rm"):
        file = directory / command
        file.write_text(f"#!{sys.executable}\n" + '''import os, pathlib, signal, subprocess, sys
command = pathlib.Path(sys.argv[0]).name
code = subprocess.run(['/bin/' + command, *sys.argv[1:]]).returncode
if code:
    sys.exit(code)
target = sys.argv[-1]
hit = target.endswith(('.toml', '.toml.disabled', '/SKILL.md'))
if os.environ.get('FAULT_JOURNAL') == '1':
    hit = command == 'mv' and target.endswith('/.install-recovery')
if hit:
    counter = pathlib.Path(os.environ['FAULT_COUNTER'])
    n = int(counter.read_text()) + 1 if counter.exists() else 1
    counter.write_text(str(n))
    if n == int(os.environ['FAULT_AT']):
        action = os.environ['FAULT_ACTION']
        if action == 'fail':
            sys.exit(73)
        os.kill(os.getppid(), getattr(signal, 'SIG' + action))
''')
        file.chmod(0o755)
    return directory


def main():
    checks = 0
    print(subprocess.check_output([BASH, "--version"], text=True).splitlines()[0], flush=True)
    with tempfile.TemporaryDirectory(prefix="cwr-regression-") as folder:
        root = Path(folder).resolve()
        directory = wrappers(root)

        def fault(action="KILL", at=1, journal=False):
            counter = root / "counter"
            counter.unlink(missing_ok=True)
            return dict(PATH=str(directory) + os.pathsep + os.environ["PATH"],
                        FAULT_COUNTER=str(counter), FAULT_ACTION=action,
                        FAULT_AT=str(at), FAULT_JOURNAL="1" if journal else "0")

        for mode, writes in (("fresh", 3), ("disable", 4), ("enable", 4), ("upgrade", 4)):
            for at in range(1, writes + 1):
                home = root / f"{mode}-{at}"
                home.mkdir()
                args, states = setup(home, mode)
                result = run(home, args, fault(at=at))
                assert result.returncode == -signal.SIGKILL, result.stdout + result.stderr
                result = run(home, args)
                assert result.returncode == 0, result.stdout + result.stderr
                verify(home, states)
                assert run(home, args).returncode == 0
                checks += 1
        for mode in ("fresh", "disable"):
            for action in ("fail", "INT", "TERM", "HUP"):
                home = root / f"{mode}-{action}"
                home.mkdir()
                args, _ = setup(home, mode)
                before = snapshot(home)
                result = run(home, args, fault(action))
                assert result.returncode != 0
                assert snapshot(home) == before, result.stdout + result.stderr
                checks += 1
        for case in ("journal", "unknown-target", "unknown-artifact", "wrong-command", "live-owner", "resume-failure"):
            home = root / case
            home.mkdir()
            assert run(home, fault=fault(journal=case == "journal")).returncode == -signal.SIGKILL
            marker = home / ".agents/skills/sol-worker-routing/.install-recovery"
            if case in ("journal", "resume-failure"):
                if case == "resume-failure":
                    assert run(home, fault=fault("fail")).returncode != 0
                    assert marker.exists()
                result = run(home)
                assert result.returncode == 0, result.stdout + result.stderr
                verify(home, (False, False))
            else:
                args = ()
                if case == "unknown-target":
                    (home / ".codex/agents/luna-medium-worker.toml").write_text("user edit")
                elif case == "unknown-artifact":
                    next(p for p in home.rglob("*.install.*") if p.is_file()).write_text("user edit")
                elif case == "wrong-command":
                    args = ("--disable-lane", "all")
                elif case == "live-owner":
                    fields = marker.read_bytes().split(b"\0")
                    fields[8] = str(os.getpid()).encode()
                    marker.write_bytes(b"\0".join(fields))
                before = snapshot(home)
                assert run(home, args).returncode != 0
                assert snapshot(home) == before
            checks += 1
        home = root / "normal"
        home.mkdir()
        assert run(home).returncode == 0
        for lane in ("luna_medium_worker", "luna_worker", "all"):
            for action in ("disable", "enable"):
                assert run(home, (f"--{action}-lane", lane)).returncode == 0
                assert run(home, (f"--{action}-lane", lane)).returncode == 0
                checks += 1
        verify(home, (False, False))
    print(json.dumps({"regression_groups_passed": checks, "scope": "temporary homes only"}))


if __name__ == "__main__":
    main()
