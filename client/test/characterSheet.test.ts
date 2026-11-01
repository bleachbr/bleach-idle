import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CHARS, START_KIT, gearBonus, maxHp, maxRei, playerAtk,
  playerDef, powerOf, rebirthBonus, reiMult, setBonuses, zanMult,
} from "../../shared/src";
import { characterSheet, type SheetGear, type SheetPlayer } from "../src/characterSheet";

// Ichigo nível 30 em Bankai, 2 renascimentos, uniforme inicial completo + conjunto Lua Negra e forja +3 na arma
const equip = { ...START_KIT.equip, weapon: "lua_negra", ring: "anel_espiritual" };
const forge = { weapon: 3 };
const g = gearBonus(equip, forge);
const base = { charId: "ichigo", level: 30, rebirths: 2, zanjutsu: 10, reiryoku: 5, equip, forge };
// o que o servidor sincroniza (recompute, train e updatePower em WorldRoom.ts) e o que manda na mensagem "inv" (sendInv)
const player: SheetPlayer = {
  ...base, exp: 0, form: 1, zanPct: 40, reiPct: 12, stepMs: 170, power: powerOf(base),
  hp: 500, maxHp: Math.round((maxHp(30) + g.hp) * rebirthBonus(2).hp), rei: 200, maxRei: maxRei(30) + g.rei,
};
const gear: SheetGear = {
  equip, forge, expBoostUntil: 0, lootBoostUntil: 0,
  atk: Math.round(playerAtk(14, 30) + g.atk), def: Math.round(playerDef(4, 30) + g.def),
};
// instantes fixos: quarta e sábado ao meio-dia de Brasília (o XP dobra no fim de semana)
const WED = Date.UTC(2026, 9, 28, 15);
const SAT = Date.UTC(2026, 9, 31, 15);

const rowOf = (sections: ReturnType<typeof characterSheet>, label: string) => {
  const r = sections.flatMap((s) => s.rows).find((x) => x.label === label);
  if (!r) throw new Error(`linha "${label}" não existe`);
  return r;
};

describe("ficha do personagem (issue #36)", () => {
  it("vida, reiatsu, ataque e defesa são os números do servidor, com a origem de cada parte", () => {
    const s = characterSheet(player, gear, WED);
    expect(rowOf(s, "Vida").value).toBe("500/671");
    expect(rowOf(s, "Vida").hint).toBe("base 550 + equipamento 60, ×1,1 do renascimento");
    expect(rowOf(s, "Reiatsu").value).toBe("200/310");
    expect(rowOf(s, "Ataque").value).toBe("70");
    expect(rowOf(s, "Ataque").hint).toBe("personagem e nível 50 + equipamento, forja e conjuntos 20");
    expect(rowOf(s, "Defesa").value).toBe("31");
    expect(rowOf(s, "Defesa").hint).toBe("personagem e nível 16 + equipamento, forja e conjuntos 15");
  });

  it("mostra o total enviado pelo servidor, não um recálculo do cliente", () => {
    const s = characterSheet(player, { ...gear, atk: 999, def: 888 }, WED);
    expect(rowOf(s, "Ataque").value).toBe("999");
    expect(rowOf(s, "Defesa").value).toBe("888");
  });

  it("multiplicadores de dano seguem a mesma cadeia do WorldRoom.hit", () => {
    const s = characterSheet(player, gear, WED);
    // estágio 1,7 × Zanjutsu 1,2 × renascimento 1,1 × conjuntos 1,06
    expect(rowOf(s, "Dano corpo a corpo").value).toBe("×2,38");
    expect(rowOf(s, "Dano corpo a corpo").hint).toBe("estágio ×1,7 · Zanjutsu ×1,2 · renascimento ×1,1 · conjuntos ×1,06");
    // o hit do servidor aplica o estágio também às técnicas: 1,7 × Reiryoku 1,15 × renascimento 1,1 × conjuntos 1,06
    expect(rowOf(s, "Dano das técnicas").value).toBe("×2,28");
    expect(rowOf(s, "Dano das técnicas").hint).toBe("estágio ×1,7 · Reiryoku ×1,15 · renascimento ×1,1 · conjuntos ×1,06; cada técnica ainda multiplica pela própria força");
    expect(rowOf(s, "Zanjutsu").value).toBe("10 (40% para o 11)");
    expect(rowOf(s, "Reiryoku").value).toBe("5 (12% para o 6)");
    expect(rowOf(s, "Golpe").value).toBe("a cada 0,65 s");
    expect(rowOf(s, "Passo").value).toBe("170 ms por quadro");
  });

  it("técnicas levam o multiplicador do estágio em todos os personagens e estágios (CHARS reais)", () => {
    const set = setBonuses(equip).total.dmg, rb = rebirthBonus(2).dmg;
    const fmt = (n: number) => `×${n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
    for (const [charId, ch] of Object.entries(CHARS)) {
      ch.forms.forEach((f, form) => {
        const s = characterSheet({ ...player, charId, form }, gear, WED);
        expect(rowOf(s, "Dano das técnicas").value, `${charId}/${f.id}`).toBe(fmt(f.dmgMult * reiMult(5) * rb * set));
        expect(rowOf(s, "Dano corpo a corpo").value, `${charId}/${f.id}`).toBe(fmt(f.dmgMult * zanMult(10) * rb * set));
      });
    }
  });

  it("XP e loot: renascimento, conjuntos, pergaminho, incenso e fim de semana", () => {
    // renascimento 1,2 × conjuntos 1,1 (Uniforme Shinigami +5% e Lua Negra +5%)
    expect(rowOf(characterSheet(player, gear, WED), "XP dos monstros").value).toBe("+32%");
    expect(rowOf(characterSheet(player, gear, SAT), "XP dos monstros").value).toBe("+164%");
    const boosted = characterSheet(player, { ...gear, expBoostUntil: WED + 60_000, lootBoostUntil: WED + 60_000 }, WED);
    expect(rowOf(boosted, "XP dos monstros").value).toBe("+98%");
    expect(rowOf(boosted, "Chance de loot").value).toBe("+30%");
    expect(rowOf(characterSheet(player, gear, WED), "Chance de loot").value).toBe("+0%");
  });

  it("renascimento: bônus atual e nível do próximo", () => {
    const r = rowOf(characterSheet(player, gear, WED), "Renascimentos");
    expect(r.value).toBe("2: +20% de XP, +10% de dano, +10% de vida");
    expect(r.hint).toBe("próximo no nível 70");
  });

  it("poder e estágio vêm do estado sincronizado", () => {
    const s = characterSheet(player, gear, WED);
    expect(rowOf(s, "Poder").value).toMatch(new RegExp(`^${player.power.toLocaleString("pt-BR").replace(".", "\\.")} · `));
    expect(rowOf(s, "Estágio").value).toBe("Bankai: Tensa Zangetsu (2/5)");
  });

  it("antes da primeira mensagem de inventário não inventa números de equipamento", () => {
    const s = characterSheet(player, null, WED);
    expect(rowOf(s, "Equipamento").value).toBe("carregando…");
    expect(s.flatMap((x) => x.rows).some((x) => x.label === "Ataque")).toBe(false);
  });

  it("o cabeçalho da barra lateral é um botão real que abre um diálogo com título", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const btn = html.match(/<button[^>]*id="sheet-btn"[^>]*>/)?.[0] ?? "";
    expect(btn, "botão #sheet-btn").not.toBe("");
    expect(btn).toMatch(/type="button"/);
    expect(btn).toMatch(/aria-haspopup="dialog"/);
    expect(html).toMatch(/<dialog id="sheet-dialog" aria-labelledby="sheet-title"/);
  });
});
