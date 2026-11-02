import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { COSMETICS, COSMETIC } from "../../shared/src";

// #24: o jogador leu "Orônloa: A Cidade Quieta" no título da crônica. O dado está certo (UTF-8);
// o título usava a fonte pixel, em que "C" e "O", "ic" e "lo" quase não se distinguem.
const css = readFileSync(new URL("../src/theme.css", import.meta.url), "utf8");
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

describe("título da crônica na leitura (#24)", () => {
  it("o texto das crônicas não tem mojibake", () => {
    expect(COSMETIC.lore_karakura.name).toBe("Crônica: A Cidade Quieta");
    for (const x of COSMETICS.filter((c) => c.kind === "lore"))
      for (const t of [x.name, x.title ?? "", ...(x.text ?? [])]) expect(t, x.id).not.toMatch(/Ã|Â|\uFFFD/);
  });

  it("o título da leitura usa a fonte de texto, não a fonte pixel", () => {
    const rule = css.match(/#shop \.lore-title\s*\{([^}]*)\}/)?.[1] ?? "";
    const font = rule.match(/font-family:\s*([^;]+)/)?.[1] ?? "";
    expect(font).not.toBe("");
    expect(font).not.toMatch(/Pixelify|--title/);
  });

  it("o cabeçalho da leitura leva a classe lore-title e o nome exato", async () => {
    const { loreReadingHtml } = await import("../src/loreReader");
    const html = loreReadingHtml(COSMETIC.lore_karakura, esc);
    expect(html).toContain(`<h3 class="lore-title">Crônica: A Cidade Quieta</h3>`);
  });
});
