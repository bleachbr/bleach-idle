#!/usr/bin/env python3
"""Regras puras de presença multiplayer (payload e peers remotos)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOGIC = ROOT / "src" / "multiplayerPresenceLogic.js"


def run_node(expr: str) -> str:
    script = f"""
import {{
  buildSyncPayload,
  selectRemotePeers,
  shouldSendSync,
  advanceAnimClock,
  lerpAxis,
  movingFromDelta,
  remoteAnimName,
}} from '{LOGIC.as_posix()}';
{expr}
"""
    proc = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout)
    return proc.stdout.strip()


def test_build_sync_payload() -> None:
    out = run_node(
        """
const payload = buildSyncPayload(
  { x: 1, y: 2, z: 3, hp: 80, maxHp: 100, dirX: 0.5, dirZ: -0.5, isMoving: true },
  { localPlayerId: 'shinigami_1', playerName: 'Orihime', selectedCharacter: 'ishida', kills: 4, damageDealt: 900 }
);
console.log(JSON.stringify(payload));
"""
    )
    import json

    payload = json.loads(out)
    assert payload["playerId"] == "shinigami_1"
    assert payload["nickname"] == "Orihime"
    assert payload["character"] == "ishida"
    assert payload["x"] == 1
    assert payload["y"] == 2
    assert payload["z"] == 3
    assert payload["kills"] == 4
    assert payload["isMoving"] is True


def test_select_remote_peers() -> None:
    out = run_node(
        """
const remotes = selectRemotePeers(
  [
    { id: 'a', nickname: 'A' },
    { id: 'b', nickname: 'B' },
    { id: 'c', nickname: 'C' },
  ],
  'b'
);
console.log(remotes.map((p) => p.id).join(','));
"""
    )
    assert out == "a,c"


def test_sync_throttle() -> None:
    out = run_node(
        """
console.log([
  shouldSendSync(0, -1, 200),
  shouldSendSync(100, 0, 200),
  shouldSendSync(200, 0, 200),
].join(','));
"""
    )
    assert out == "true,false,true"


def test_remote_anim_helpers() -> None:
    out = run_node(
        """
const a = advanceAnimClock(0.04, 3, 0.02, 10, 12);
const b = advanceAnimClock(0.09, 3, 0.02, 10, 12);
console.log([
  remoteAnimName(false, 0),
  remoteAnimName(true, 2),
  remoteAnimName(true, 7),
  movingFromDelta(0.2, 0, 0.05),
  movingFromDelta(0.01, 0, 0.05),
  +lerpAxis(0, 10, 0.5).toFixed(1),
  a.animFrame,
  b.animFrame,
].join(','));
"""
    )
    assert out == "idle,walk,run,true,false,5,3,4"


def main() -> int:
    if not LOGIC.exists():
        raise AssertionError(f"missing {LOGIC}")
    test_build_sync_payload()
    test_select_remote_peers()
    test_sync_throttle()
    test_remote_anim_helpers()
    print("OK test_multiplayer_presence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
