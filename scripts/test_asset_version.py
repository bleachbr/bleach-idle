"""Testes da versão nas URLs de textura (`src/assetVersion.js`), via Node.

O nginx guarda `/src/assets/` por 1 hora e o nome do arquivo não muda entre deploys. Sem a versão
na URL, quem jogou antes do deploy continua vendo a tira antiga.
"""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def versioned(urls: list[str], version: str = "abc123") -> list[str]:
    script = (
        "import { versionedAssetUrl } from './src/assetVersion.js';\n"
        f"const urls = {json.dumps(urls)};\n"
        f"console.log(JSON.stringify(urls.map((u) => versionedAssetUrl(u, {json.dumps(version)}))));"
    )
    proc = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, check=True,
                          capture_output=True, text=True)
    return json.loads(proc.stdout.strip())


class TestVersionedAssetUrl(unittest.TestCase):
    def test_game_textures_get_the_build_version(self):
        self.assertEqual(versioned(["/src/assets/characters/ishida/anims/move_slash_front.png"]),
                         ["/src/assets/characters/ishida/anims/move_slash_front.png?v=abc123"])

    def test_existing_query_is_kept(self):
        self.assertEqual(versioned(["/src/assets/fx/a.png?x=1"]), ["/src/assets/fx/a.png?x=1&v=abc123"])

    def test_other_urls_are_untouched(self):
        urls = ["/assets/main-123.js", "data:image/png;base64,AAAA", "blob:http://x/1", "https://cdn.example/a.png"]
        self.assertEqual(versioned(urls), urls)

    def test_without_version_nothing_changes(self):
        self.assertEqual(versioned(["/src/assets/fx/a.png"], ""), ["/src/assets/fx/a.png"])


if __name__ == "__main__":
    unittest.main()
