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
LANES = ("luna-worker",)


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
        return (), (False,)
    if mode == "upgrade":
        for name, off in zip(("luna-medium-worker", "luna-worker"), (False, True)):
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
        return (), (True,)
    assert run(home).returncode == 0
    if mode == "enable":
        assert run(home, ("--disable-lane", "all")).returncode == 0
        return ("--enable-lane", "all"), (False,)
    return ("--disable-lane", "all"), (True,)


def verify(home, disabled):
    for name, off in zip(LANES, disabled):
        base = home / ".codex/agents" / (name + ".toml")
        target = Path(str(base) + ".disabled") if off else base
        other = base if off else Path(str(base) + ".disabled")
        assert target.read_bytes() == (ROOT / "agents" / (name + ".toml")).read_bytes()
        assert not other.exists()
    assert (home / ".agents/skills/sol-worker-routing/SKILL.md").read_bytes() == (
        ROOT / "skills/sol-worker-routing/SKILL.md").read_bytes()
    for name in ("luna-medium-worker", "spark-scout", "deepseek-worker", "deepseek-pro-worker"):
        for suffix in (".toml", ".toml.disabled"):
            assert not (home / ".codex/agents" / (name + suffix)).exists()
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

        for disabled in (False, True):
            home = root / ("previous-max-disabled" if disabled else "previous-max-enabled")
            previous = "d058287492a01419922b17100f041abf1ac2d1eb"
            for source, target in (
                ("agents/luna-worker.toml", ".codex/agents/luna-worker.toml" + (".disabled" if disabled else "")),
                ("skills/sol-worker-routing/SKILL.md", ".agents/skills/sol-worker-routing/SKILL.md"),
            ):
                file = home / target
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(subprocess.check_output(["git", "show", f"{previous}:{source}"], cwd=ROOT))
            result = run(home)
            assert result.returncode == 0, result.stdout + result.stderr
            verify(home, (disabled,))
            checks += 1

        def fault(action="KILL", at=1, journal=False):
            counter = root / "counter"
            counter.unlink(missing_ok=True)
            return dict(PATH=str(directory) + os.pathsep + os.environ["PATH"],
                        FAULT_COUNTER=str(counter), FAULT_ACTION=action,
                        FAULT_AT=str(at), FAULT_JOURNAL="1" if journal else "0")

        for mode, writes in (("fresh", 2), ("disable", 2), ("enable", 2), ("upgrade", 4)):
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
                verify(home, (False,))
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
                    fields[7] = str(os.getpid()).encode()
                    marker.write_bytes(b"\0".join(fields))
                before = snapshot(home)
                assert run(home, args).returncode != 0
                assert snapshot(home) == before
            checks += 1
        home = root / "normal"
        home.mkdir()
        assert run(home).returncode == 0
        for lane in ("luna_worker", "all"):
            for action in ("disable", "enable"):
                assert run(home, (f"--{action}-lane", lane)).returncode == 0
                assert run(home, (f"--{action}-lane", lane)).returncode == 0
                checks += 1
        verify(home, (False,))
        before = snapshot(home)
        assert run(home, ("--enable-lane", "luna_medium_worker")).returncode != 0
        assert snapshot(home) == before
        for case in ("enabled", "disabled", "unknown", "dual", "symlink", "directory"):
            home = root / ("medium-" + case)
            home.mkdir()
            setup(home, "upgrade")
            base = home / ".codex/agents/luna-medium-worker.toml"
            if case == "disabled":
                base.rename(Path(str(base) + ".disabled"))
            elif case == "unknown":
                base.write_text("user edit")
            elif case == "dual":
                Path(str(base) + ".disabled").write_bytes(base.read_bytes())
            elif case in ("symlink", "directory"):
                base.unlink()
                if case == "symlink":
                    base.symlink_to(home / ".codex/agents/luna-worker.toml.disabled")
                else:
                    base.mkdir()
            before = snapshot(home)
            result = run(home)
            if case in ("enabled", "disabled"):
                assert result.returncode == 0, result.stdout + result.stderr
                verify(home, (True,))
            else:
                assert result.returncode != 0
                assert snapshot(home) == before
            checks += 1
    print(json.dumps({"regression_groups_passed": checks, "scope": "temporary homes only"}))


if __name__ == "__main__":
    main()
