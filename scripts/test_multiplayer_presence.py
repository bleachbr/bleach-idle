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


def test_shared_horde_logic() -> None:
    horde_logic = ROOT / "src" / "multiplayerHordeLogic.js"
    script = f"""
import {{
  shouldUseSharedHorde,
  getTopDamagePlayer,
  queueSharedDamage,
  queueSharedReishiClaim,
  drainSharedHordeEvents,
  reconcileSharedHollows,
  reconcileSharedReishi,
}} from '{horde_logic.as_posix()}';
queueSharedDamage('sh_1', 25, 'asauchi');
queueSharedReishiClaim('sr_1');
const drained = drainSharedHordeEvents();
const empty = drainSharedHordeEvents();
const pool = [{{ active: true, serverId: 'sh_1', x: 0, z: 0 }}, {{ active: false, serverId: null }}];
const spawned = [];
const updated = [];
reconcileSharedHollows(pool, [{{ id: 'sh_1', x: 5, z: 6 }}, {{ id: 'sh_2', x: 9, z: 10 }}], {{
  onSpawn: (s) => spawned.push(s.id),
  onUpdate: (en, s) => updated.push([en.serverId, s.x]),
  onDespawn: () => {{}},
}});
const drops = [{{ serverId: 'sr_old' }}];
const removed = [];
const addedDrops = [];
reconcileSharedReishi(drops, [{{ id: 'sr_new', ownerPlayerId: 'p2' }}], {{
  onSpawn: (d) => addedDrops.push(d.id),
  onRemove: (i) => removed.push(i),
}});
console.log(JSON.stringify({{
  solo: shouldUseSharedHorde(0),
  coop: shouldUseSharedHorde(1),
  top: getTopDamagePlayer({{ p1: 15, p2: 40 }}, 'p1'),
  drained,
  empty,
  spawned,
  updated,
  removed,
  addedDrops,
}}));
"""
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=str(ROOT), capture_output=True, text=True)
    if proc.returncode != 0:
        raise AssertionError(proc.stderr or proc.stdout)
    import json
    res = json.loads(proc.stdout.strip())
    assert res["solo"] is False and res["coop"] is True
    assert res["top"] == "p2"
    assert len(res["drained"]["damageEvents"]) == 1
    assert res["drained"]["reishiClaims"] == ["sr_1"]
    assert res["empty"]["damageEvents"] == []
    assert res["spawned"] == ["sh_2"]
    assert res["updated"] == [["sh_1", 5]]
    assert res["removed"] == [0]
    assert res["addedDrops"] == ["sr_new"]


def main() -> int:
    if not LOGIC.exists():
        raise AssertionError(f"missing {LOGIC}")
    test_build_sync_payload()
    test_select_remote_peers()
    test_sync_throttle()
    test_remote_anim_helpers()
    test_shared_horde_logic()
    print("OK test_multiplayer_presence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
