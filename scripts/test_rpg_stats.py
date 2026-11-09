#!/usr/bin/env python3
"""
Testes unitários automatizados para o sistema de atributos RPG,
limite de armas/passivas, caps matemáticos (CDR 65%, DEF 75%, REGEN 4%)
e sinergias de build de Bleach: Soul Survivor.
"""

import math
import unittest


def calculate_cdr_percent(haste: float) -> float:
    raw_cdr = (haste / (100.0 + haste)) * 100.0
    return min(65.0, round(raw_cdr * 10) / 10.0)


def get_effective_cooldown(base_cd: float, haste: float) -> float:
    cd_multiplier = max(0.35, 100.0 / (100.0 + haste))
    return max(0.25, base_cd * cd_multiplier)


def calculate_hierro_mitigation(hierro_points: float) -> float:
    if hierro_points <= 0:
        return 0.0
    reduction = 1.0 - (100.0 / (100.0 + hierro_points))
    capped = min(0.75, reduction)
    return round(capped * 1000) / 10.0


def apply_hierro_mitigation(incoming_damage: float, hierro_points: float) -> int:
    if hierro_points <= 0:
        return int(incoming_damage)
    reduction = 1.0 - (100.0 / (100.0 + hierro_points))
    multiplier = max(0.25, 1.0 - min(0.75, reduction))
    return max(1, int(round(incoming_damage * multiplier)))


def calculate_kaido_regen(level: int, max_hp: float = 100.0) -> float:
    if level <= 0:
        return 0.0
    raw_regen = level * 1.5
    max_allowed = max_hp * 0.04
    return min(raw_regen, max_allowed)


def detect_synergies(weapons: dict, passives: dict) -> list:
    synergies = []
    if weapons.get("getsuga", 0) > 0 and passives.get("reiatsu", 0) >= 2:
        synergies.append("getsuga_reiatsu")
    if weapons.get("byakurai", 0) > 0 and passives.get("shunpo", 0) >= 2:
        synergies.append("byakurai_shunpo")
    if weapons.get("shakkaho", 0) > 0 and passives.get("magnet", 0) >= 2:
        synergies.append("shakkaho_vortex")
    if passives.get("hierro", 0) >= 2 and passives.get("kaido", 0) >= 2:
        synergies.append("hierro_kaido")
    return synergies


class TestRpgStatsEngine(unittest.TestCase):
    def test_cdr_hard_cap_at_65_percent(self):
        # Baixa aceleração
        self.assertAlmostEqual(calculate_cdr_percent(0), 0.0)
        self.assertAlmostEqual(calculate_cdr_percent(25), 20.0)
        self.assertAlmostEqual(calculate_cdr_percent(100), 50.0)
        # Alta aceleração deve respeitar o hard cap de 65.0%
        self.assertEqual(calculate_cdr_percent(200), 65.0)
        self.assertEqual(calculate_cdr_percent(9999), 65.0)

    def test_effective_cooldown_minimum_35_percent(self):
        base_cd = 2.8  # Getsuga base
        # Com Haste 0, cooldown é 2.8s
        self.assertAlmostEqual(get_effective_cooldown(base_cd, 0), 2.8)
        # Com Haste 100 (50% CDR), cooldown é 1.4s
        self.assertAlmostEqual(get_effective_cooldown(base_cd, 100), 1.4)
        # Com Haste infinita, cooldown não pode ser inferior a 35% do base (0.98s)
        self.assertAlmostEqual(get_effective_cooldown(base_cd, 9999), base_cd * 0.35)

    def test_hierro_mitigation_hard_cap_at_75_percent(self):
        self.assertEqual(calculate_hierro_mitigation(0), 0.0)
        self.assertAlmostEqual(calculate_hierro_mitigation(25), 20.0)
        self.assertAlmostEqual(calculate_hierro_mitigation(100), 50.0)
        # Hierro 300 alcança exatamente 75%
        self.assertEqual(calculate_hierro_mitigation(300), 75.0)
        # Hierro 9000 continua travado em 75.0%
        self.assertEqual(calculate_hierro_mitigation(9000), 75.0)

    def test_hierro_damage_application(self):
        incoming = 40.0
        # Sem Hierro: recebe 40
        self.assertEqual(apply_hierro_mitigation(incoming, 0), 40)
        # Hierro 100 (50% redução): recebe 20
        self.assertEqual(apply_hierro_mitigation(incoming, 100), 20)
        # Hierro massivo: recebe no mínimo 25% do dano (10 de dano)
        self.assertEqual(apply_hierro_mitigation(incoming, 1000), 10)

    def test_kaido_combat_regen_cap(self):
        # Max HP 100 -> teto de 4% é 4.0 HP/s
        self.assertEqual(calculate_kaido_regen(0, 100), 0.0)
        self.assertEqual(calculate_kaido_regen(1, 100), 1.5)
        self.assertEqual(calculate_kaido_regen(2, 100), 3.0)
        # Nível 3 seria 4.5, mas o cap de 4% de 100 corta para 4.0
        self.assertEqual(calculate_kaido_regen(3, 100), 4.0)
        self.assertEqual(calculate_kaido_regen(5, 100), 4.0)

    def test_synergy_detection(self):
        # Sem passivas: nenhuma sinergia
        self.assertEqual(detect_synergies({"getsuga": 1}, {}), [])
        # Getsuga + Reiatsu 2 -> getsuga_reiatsu
        syn1 = detect_synergies({"getsuga": 1}, {"reiatsu": 2})
        self.assertIn("getsuga_reiatsu", syn1)
        # Byakurai + Shunpo 2 -> byakurai_shunpo
        syn2 = detect_synergies({"byakurai": 1}, {"shunpo": 2})
        self.assertIn("byakurai_shunpo", syn2)
        # Hierro 2 + Kaido 2 -> muralha espiritual
        syn3 = detect_synergies({}, {"hierro": 2, "kaido": 2})
        self.assertIn("hierro_kaido", syn3)


if __name__ == "__main__":
    unittest.main()
