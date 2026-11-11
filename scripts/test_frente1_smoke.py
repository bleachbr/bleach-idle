"""Smoke test rápido e versionado para o CI que valida as fiações da Frente 1.

Valida sem Playwright / browser:
1. Prólogo no Dangai: exports do módulo e caminho completo de conclusão (onComplete callback + limpeza de estado/entidades).
2. Hollow Elite: estatísticas puras do configureHollow e pontos de integração no loop principal (spawn periódico, escala/cor, drop de 6 Reishi e censo).
3. Ciclo e HUD do Boss: flags bossSpawned e bossActive em cycleState atualizadas por markBossSpawned e lidas pelo HUD updateBossBar.
4. Trava de pulo no prólogo: verificação estática e comportamental de bloqueio do pulo com prólogo ativo usando a função real fatiada de src/main.js.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import unittest
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[1]


def get_jump_player_source() -> str:
    root = repo_root()
    main_content = (root / "src/main.js").read_text(encoding="utf-8")
    match = re.search(r"(function\s+jumpPlayer\s*\(\)\s*\{[\s\S]*?\n\})", main_content)
    if not match:
        raise ValueError("jumpPlayer declaration not found in src/main.js")
    return match.group(1)


DOM_MOCK_SNIPPET = """
let __domStore = {};
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 128, height: 160,
                getContext: () => ({
                    fillStyle: '', shadowColor: '', shadowBlur: 0,
                    fillRect: () => {}, clearRect: () => {}, fillText: () => {},
                    roundRect: () => {}, stroke: () => {}, measureText: () => ({ width: 60 }),
                    beginPath: () => {}, arc: () => {}, fill: () => {}
                })
            };
        }
        return {
            id: '', className: '', innerHTML: '',
            classList: {
                classes: new Set(),
                add(c) { this.classes.add(c); },
                remove(c) { this.classes.delete(c); },
                contains(c) { return this.classes.has(c); }
            },
            appendChild: () => {}
        };
    },
    body: { appendChild: () => {} },
    getElementById: (id) => {
        if (!__domStore[id]) {
            __domStore[id] = {
                id,
                style: { width: '100%' },
                classList: {
                    classes: new Set(id === 'boss-bar-container' ? ['hidden'] : []),
                    add(c) { this.classes.add(c); },
                    remove(c) { this.classes.delete(c); },
                    contains(c) { return this.classes.has(c); }
                },
                src: '', textContent: ''
            };
        }
        return __domStore[id];
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};
"""


def run_node(script: str) -> dict:
    root = repo_root()
    loader_path = root / "scripts" / "three_loader.mjs"
    cmd = ["node", "--no-warnings"]
    if loader_path.exists():
        cmd.extend(["--loader", loader_path.as_uri()])
    cmd.extend(["--input-type=module", "-e", script])

    proc = subprocess.run(
        cmd,
        cwd=root,
        check=True,
        capture_output=True,
        text=True,
        env=os.environ,
    )
    return json.loads(proc.stdout.strip())


class TestPrologueWiring(unittest.TestCase):
    def test_prologue_module_exports(self):
        res = run_node("""
            import * as prologue from './src/prologue.js';
            const expected = [
                'startPrologue',
                'updatePrologue',
                'startCinematicTransition',
                'cancelPrologue',
                'isPrologueActive',
                'isPrologueCinematicTransition'
            ];
            const found = {};
            for (const name of expected) {
                found[name] = typeof prologue[name];
            }
            console.log(JSON.stringify(found));
        """)
        for fn_name in [
            "startPrologue",
            "updatePrologue",
            "startCinematicTransition",
            "cancelPrologue",
            "isPrologueActive",
            "isPrologueCinematicTransition",
        ]:
            self.assertEqual(res[fn_name], "function", f"{fn_name} deve ser exportada como função")

    def test_prologue_completion_path_and_cleanup(self):
        res = run_node(f"""
            {DOM_MOCK_SNIPPET}
            import * as THREE from 'three';
            import {{
                startPrologue,
                updatePrologue,
                isPrologueActive,
                isPrologueCinematicTransition,
                startCinematicTransition,
                cancelPrologue
            }} from './src/prologue.js';

            // Dispara callbacks de timer imediatamente sem delay no Node
            global.setTimeout = (fn) => {{ fn(); return 1; }};

            const scene = new THREE.Scene();
            const loader = {{
                load: () => ({{ colorSpace: '', magFilter: '', minFilter: '' }})
            }};
            const dangaiMap = {{
                terrainMesh: {{ material: {{ map: {{ offset: {{ set: () => {{}}, y: 0 }} }} }} }},
                propGroup: {{ children: [] }}
            }};
            const player = {{ x: 0.85, y: 0, z: 0, isMoving: true }};
            const playerMesh = {{
                position: {{ set(x, y, z) {{ this.x = x; this.y = y; this.z = z; }} }},
                quaternion: {{ copy: () => {{}} }}
            }};
            const camera = {{
                position: {{ set(x, y, z) {{ this.x = x; this.y = y; this.z = z; }} }},
                quaternion: {{ copy: () => {{}} }},
                lookAt: () => {{}}
            }};

            let onCompleteCalled = false;
            startPrologue({{
                scene,
                loader,
                dangaiMap,
                getHeightFn: () => 0,
                onComplete: () => {{ onCompleteCalled = true; }}
            }});

            const activeInitially = isPrologueActive();
            startCinematicTransition();
            const cinematicActive = isPrologueCinematicTransition();

            // Avança o loop cinematográfico além da duração (CINEMATIC_DURATION = 1.4s)
            updatePrologue(1.5, {{ camera, player, playerMesh, dangaiMap, showRunFrame: () => {{}} }});

            const activeAfterCompletion = isPrologueActive();
            const cinematicAfterCompletion = isPrologueCinematicTransition();

            let portalRemaining = false;
            let rukiaRemaining = false;
            scene.traverse(obj => {{
                if (obj.name === 'senkaimon_portal_group') portalRemaining = true;
                if (obj.name === 'rukia_npc_group') rukiaRemaining = true;
            }});

            console.log(JSON.stringify({{
                activeInitially,
                cinematicActive,
                activeAfterCompletion,
                cinematicAfterCompletion,
                onCompleteCalled,
                portalRemaining,
                rukiaRemaining
            }}));
        """)
        self.assertTrue(res["activeInitially"], "Prólogo deve iniciar ativo")
        self.assertTrue(res["cinematicActive"], "Transição cinematográfica deve ativar")
        self.assertFalse(res["activeAfterCompletion"], "Prólogo deve ficar inativo após completar")
        self.assertFalse(res["cinematicAfterCompletion"], "Cinemática deve desligar após completar")
        self.assertTrue(res["onCompleteCalled"], "Callback onComplete deve ser chamado ao concluir o prólogo")
        self.assertFalse(res["portalRemaining"], "Portal Senkaimon deve ser removido da cena após conclusão")
        self.assertFalse(res["rukiaRemaining"], "Rukia NPC deve ser removida da cena após conclusão")

    def test_prologue_cancel_path(self):
        res = run_node(f"""
            {DOM_MOCK_SNIPPET}
            import * as THREE from 'three';
            import {{ startPrologue, cancelPrologue, isPrologueActive }} from './src/prologue.js';

            const scene = new THREE.Scene();
            const loader = {{ load: () => ({{ colorSpace: '', magFilter: '', minFilter: '' }}) }};
            const dangaiMap = {{ terrainMesh: {{}}, propGroup: {{ children: [] }} }};

            startPrologue({{ scene, loader, dangaiMap, getHeightFn: () => 0, onComplete: () => {{}} }});
            const beforeCancel = isPrologueActive();
            cancelPrologue();
            const afterCancel = isPrologueActive();

            console.log(JSON.stringify({{ beforeCancel, afterCancel }}));
        """)
        self.assertTrue(res["beforeCancel"])
        self.assertFalse(res["afterCancel"], "cancelPrologue deve desativar o prólogo imediatamente")


class TestEliteHollowWiring(unittest.TestCase):
    def test_elite_configure_hollow_stats(self):
        res = run_node("""
            import { configureHollow } from './src/hollowTypes.js';
            const mult = { hpMult: 1.5, speedMult: 1.25 };
            const en = { id: 42 };
            configureHollow(en, 'shrieker', true, mult);
            console.log(JSON.stringify({
                type: en.type,
                isElite: en.isElite,
                hp: en.hp,
                maxHp: en.maxHp,
                scale: en.scale,
                speed: en.speed,
                contactDamage: en.contactDamage
            }));
        """)
        self.assertEqual(res["type"], "elite")
        self.assertTrue(res["isElite"])
        self.assertEqual(res["hp"], 300)  # 200 * 1.5
        self.assertEqual(res["maxHp"], 300)
        self.assertEqual(res["scale"], 2.2)
        self.assertAlmostEqual(res["speed"], 4.25)  # 3.4 * 1.25
        self.assertEqual(res["contactDamage"], 22)

    def test_elite_integration_points_in_game_loop(self):
        root = repo_root()
        main_content = (root / "src/main.js").read_text(encoding="utf-8")

        # 1. Spawn periódico com timer dedicado
        self.assertIn("eliteSpawnTimer -= dt;", main_content)
        self.assertIn("spawnHollow(true);", main_content)

        # 2. Chamada de configureHollow repassando isElite e multiplicadores
        self.assertIn("configureHollow(en, pickHollowType(state.time), isElite, mult);", main_content)

        # 3. Setup visual: escala e tint carmesim (0xff3355) para elite
        self.assertIn("en.mesh.material.color.setHex(en.isElite ? 0xff3355 : 0xffffff);", main_content)

        # 4. Drop de 6 Reishi na morte de elite (vs 1 de comum e 26 de boss)
        self.assertIn("spawnReishi(en.x, en.z, en.isBoss ? 26 : (en.isElite ? 6 : 1), topPlayerId);", main_content)

        # 5. Censo registra o tipo 'elite'
        self.assertIn("state.census[en.type] = (state.census[en.type] || 0) + 1;", main_content)


class TestBossSpawnCycleHUDWiring(unittest.TestCase):
    def test_mark_boss_spawned_sets_cycle_flags(self):
        res = run_node("""
            import { createCycleState, markBossSpawned } from './src/cycle.js';
            const cycleState = createCycleState();
            const before = {
                bossSpawned: cycleState.bossSpawned,
                bossActive: cycleState.bossActive
            };
            markBossSpawned(cycleState);
            const after = {
                bossSpawned: cycleState.bossSpawned,
                bossActive: cycleState.bossActive
            };
            console.log(JSON.stringify({ before, after }));
        """)
        self.assertFalse(res["before"]["bossSpawned"])
        self.assertFalse(res["before"]["bossActive"])
        self.assertTrue(res["after"]["bossSpawned"])
        self.assertTrue(res["after"]["bossActive"])

    def test_boss_bar_hud_gates_on_cycle_state_transitions(self):
        res = run_node(f"""
            {DOM_MOCK_SNIPPET}
            import {{ createCycleState, markBossSpawned, advanceToNextCycle, resetCycleState }} from './src/cycle.js';
            import {{ updateBossBar }} from './src/hud.js';

            const cycleState = createCycleState();
            const state = {{ cycleState }};
            const enemyMeshes = [{{ active: true, isBoss: true, hp: 1500, maxHp: 2000 }}];

            // 1. Antes do spawn: barra oculta
            updateBossBar(state, enemyMeshes);
            const hiddenBefore = document.getElementById('boss-bar-container').classList.contains('hidden');

            // 2. Boss surge via markBossSpawned: barra ativa e atualiza HP para 75%
            markBossSpawned(cycleState);
            document.getElementById('boss-bar-container').classList.remove('hidden');
            updateBossBar(state, enemyMeshes);
            const fillActive = document.getElementById('boss-hp-fill').style.width;
            const hiddenActive = document.getElementById('boss-bar-container').classList.contains('hidden');

            // 3. Boss leva dano até 25% de HP
            enemyMeshes[0].hp = 500;
            updateBossBar(state, enemyMeshes);
            const fillDamaged = document.getElementById('boss-hp-fill').style.width;

            // 4. Boss derrotado e próximo ciclo acionado: container deve receber hidden
            advanceToNextCycle(cycleState);
            updateBossBar(state, enemyMeshes);
            const hiddenAfterAdvance = document.getElementById('boss-bar-container').classList.contains('hidden');

            // 5. Reset completo do ciclo: container permanece hidden
            markBossSpawned(cycleState);
            document.getElementById('boss-bar-container').classList.remove('hidden');
            resetCycleState(cycleState);
            updateBossBar(state, enemyMeshes);
            const hiddenAfterReset = document.getElementById('boss-bar-container').classList.contains('hidden');

            console.log(JSON.stringify({{
                hiddenBefore,
                fillActive,
                hiddenActive,
                fillDamaged,
                hiddenAfterAdvance,
                hiddenAfterReset
            }}));
        """)
        self.assertTrue(res["hiddenBefore"], "Barra de boss deve estar oculta antes do spawn")
        self.assertFalse(res["hiddenActive"], "Barra de boss deve estar visível após spawn")
        self.assertEqual(res["fillActive"], "75%")
        self.assertEqual(res["fillDamaged"], "25%")
        self.assertTrue(res["hiddenAfterAdvance"], "Barra deve ser ocultada após advanceToNextCycle")
        self.assertTrue(res["hiddenAfterReset"], "Barra deve ser ocultada após resetCycleState")

    def test_main_wires_boss_spawn_to_mark_boss_spawned(self):
        root = repo_root()
        main_content = (root / "src/main.js").read_text(encoding="utf-8")
        self.assertIn("spawnBossMenosGrande();", main_content)
        self.assertIn("markBossSpawned(state.cycleState);", main_content)


class TestJumpPrologueLock(unittest.TestCase):
    def test_jump_player_static_lock(self):
        jump_fn = get_jump_player_source()
        self.assertIn(
            "if (isPrologueActive()) return;",
            jump_fn,
            "jumpPlayer body fatiado de src/main.js deve conter a trava if (isPrologueActive()) return;"
        )

    def test_jump_player_behavioral_lock(self):
        jump_fn = get_jump_player_source()
        res = run_node(f"""
            {DOM_MOCK_SNIPPET}
            import * as THREE from 'three';
            import {{ startPrologue, cancelPrologue, isPrologueActive }} from './src/prologue.js';

            const scene = new THREE.Scene();
            const loader = {{ load: () => ({{ colorSpace: '', magFilter: '', minFilter: '' }}) }};
            const dangaiMap = {{ terrainMesh: {{}}, propGroup: {{ children: [] }} }};

            const player = {{ isGrounded: true, vy: 0, jumpStrength: 6.5 }};
            const state = {{ active: true, paused: false }};

            {jump_fn}

            // 1. Inicia prólogo -> salto deve ser ignorado
            startPrologue({{ scene, loader, dangaiMap, getHeightFn: () => 0, onComplete: () => {{}} }});
            jumpPlayer();
            const vyDuringPrologue = player.vy;
            const groundedDuringPrologue = player.isGrounded;

            // 2. Cancela prólogo -> salto deve funcionar
            cancelPrologue();
            jumpPlayer();
            const vyAfterPrologue = player.vy;
            const groundedAfterPrologue = player.isGrounded;

            console.log(JSON.stringify({{
                vyDuringPrologue,
                groundedDuringPrologue,
                vyAfterPrologue,
                groundedAfterPrologue
            }}));
        """)
        self.assertEqual(res["vyDuringPrologue"], 0, "Salto deve ser bloqueado durante o prólogo")
        self.assertTrue(res["groundedDuringPrologue"], "Jogador deve permanecer no solo durante o prólogo")
        self.assertEqual(res["vyAfterPrologue"], 6.5, "Salto deve funcionar após saída do prólogo")
        self.assertFalse(res["groundedAfterPrologue"], "Jogador não deve estar grounded após pular")


if __name__ == "__main__":
    unittest.main()
