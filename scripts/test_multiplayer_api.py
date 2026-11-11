#!/usr/bin/env python3
"""API multiplayer: join/sync/room devem responder JSON em servidor de produção."""

from __future__ import annotations

import json
import os
import signal
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PORT = 34567
BASE = f"http://127.0.0.1:{PORT}"


def http_json(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list | str]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"} if body is not None else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=3) as res:
            raw = res.read().decode("utf-8")
            try:
                return res.status, json.loads(raw)
            except json.JSONDecodeError:
                return res.status, raw
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8")
        try:
            return err.code, json.loads(raw)
        except json.JSONDecodeError:
            return err.code, raw


def wait_health(proc: subprocess.Popen, timeout: float = 8.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if proc.poll() is not None:
            raise RuntimeError(f"server exited early with code {proc.returncode}")
        try:
            code, body = http_json("GET", "/healthz")
            if code == 200 and (body == "ok\n" or body == "ok" or "ok" in str(body)):
                return
        except Exception:
            time.sleep(0.1)
    raise RuntimeError("healthz timeout")


def start_server(static_root: Path) -> subprocess.Popen:
    env = os.environ.copy()
    env["PORT"] = str(PORT)
    env["STATIC_ROOT"] = str(static_root)
    env["LOGS_DIR"] = str(static_root / "logs")
    return subprocess.Popen(
        ["node", str(ROOT / "server" / "production_server.js")],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )


def test_two_players_share_room() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        static_root = Path(tmp)
        (static_root / "index.html").write_text("<!doctype html><title>t</title>", encoding="utf-8")
        proc = start_server(static_root)
        try:
            wait_health(proc)

            code, join1 = http_json("POST", "/api/multiplayer/join", {
                "playerId": "shinigami_aaaa",
                "nickname": "Ichigo",
            })
            assert code == 200, join1
            assert isinstance(join1, dict) and join1.get("success") is True, join1

            code, join2 = http_json("POST", "/api/multiplayer/join", {
                "playerId": "shinigami_bbbb",
                "nickname": "Rukia",
            })
            assert code == 200, join2

            code, sync1 = http_json("POST", "/api/multiplayer/sync", {
                "playerId": "shinigami_aaaa",
                "nickname": "Ichigo",
                "x": 3.5,
                "y": 0.2,
                "z": -4.0,
                "character": "ichigo_shikai",
                "hp": 90,
                "maxHp": 100,
                "kills": 2,
                "damageDealt": 120,
                "dirX": 0,
                "dirZ": -1,
                "isMoving": True,
            })
            assert code == 200, sync1
            assert isinstance(sync1, dict)
            players = sync1["room"]["activePlayers"]
            ids = {p["id"] for p in players}
            assert ids == {"shinigami_aaaa", "shinigami_bbbb"}, ids
            me = next(p for p in players if p["id"] == "shinigami_aaaa")
            assert abs(me["x"] - 3.5) < 1e-6
            assert me["nickname"] == "Ichigo"
            assert me["character"] == "ichigo_shikai"

            code, room = http_json("GET", "/api/multiplayer/room")
            assert code == 200, room
            assert isinstance(room, dict)
            assert room["room"]["activeCount"] == 2
            assert not str(room).lstrip().startswith("<!doctype"), "API must not return SPA HTML"
        finally:
            proc.send_signal(signal.SIGTERM)
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()


def test_api_not_spa_fallback() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        static_root = Path(tmp)
        (static_root / "index.html").write_text(
            "<!doctype html><html><body>SPA</body></html>", encoding="utf-8"
        )
        proc = start_server(static_root)
        try:
            wait_health(proc)
            code, body = http_json("GET", "/api/multiplayer/room")
            assert code == 200, body
            assert isinstance(body, dict), f"expected JSON object, got {type(body)}: {body!r}"
            assert "room" in body
        finally:
            proc.send_signal(signal.SIGTERM)
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()


def main() -> int:
    test_api_not_spa_fallback()
    test_two_players_share_room()
    print("OK test_multiplayer_api")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
