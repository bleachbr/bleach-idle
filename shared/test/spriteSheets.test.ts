import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { SPRITES, spriteCols } from "../src/data";

// Largura e altura de um PNG, lidas do cabeçalho IHDR (bytes 16 a 23), sem dependência de imagem.
function pngSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const dir = new URL("../../client/public/assets/sprites/", import.meta.url);

describe("folhas de sprite batem com SPRITES", () => {
  it("toda folha existe e tem frame x colunas de largura e 4 direções de altura", () => {
    const wrong: string[] = [];
    for (const [key, def] of Object.entries(SPRITES)) {
      const file = new URL(`${key}.png`, dir);
      if (!existsSync(file)) { wrong.push(`${key}: arquivo não existe`); continue; }
      const { w, h } = pngSize(file.pathname.replace(/^\/([A-Za-z]:)/, "$1"));
      const cols = spriteCols(key);
      if (w !== def.frame * cols || h !== def.frame * 4) wrong.push(`${key}: ${w}x${h}, esperado ${def.frame * cols}x${def.frame * 4}`);
    }
    expect(wrong).toEqual([]);
  });
});
