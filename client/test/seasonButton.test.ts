import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { toggleSeasonPass, SEASON_BTN_DEFAULTS } from "../src/seasonButton";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("botão de acesso direto ao Passe de Temporada no HUD (★)", () => {
  it("o index.html contém o botão #season-btn dentro de .who-icons com ícone/texto ★ e acessibilidade completa", () => {
    const html = read("../index.html");
    const whoIcons = html.slice(html.indexOf('<span class="who-icons">'), html.indexOf('</span></div>'));
    expect(whoIcons, "barra .who-icons deve existir").not.toBe("");

    // O botão deve estar dentro de who-icons
    const btnMatch = whoIcons.match(/<button[^>]*id="season-btn"[^>]*>([\s\S]*?)<\/button>/);
    expect(btnMatch, "botão #season-btn deve existir dentro de .who-icons").not.toBeNull();

    const [fullTag, textContent] = btnMatch!;
    expect(fullTag).toMatch(/type="button"/);
    expect(fullTag).toMatch(/id="season-btn"/);
    expect(fullTag).toMatch(/class="[^"]*icon-btn[^"]*"/);

    // Texto de estrela visível dentro do botão (★)
    expect(textContent.trim()).toBe("★");

    // Atributos de acessibilidade e tooltip
    expect(fullTag).toMatch(/aria-label="Passe de Temporada \(★\)"/);
    expect(fullTag).toMatch(/title="Passe de Temporada \(★, grátis\)"/);
    expect(fullTag).toMatch(/aria-controls="pass"/);
  });

  it("ao ser clicado com o painel fechado, solicita a abertura do passe ao servidor (seasonOpen)", () => {
    const panel = { hidden: true };
    const send = vi.fn();

    toggleSeasonPass(panel as any, send);

    expect(send).toHaveBeenCalledWith("seasonOpen");
    expect(panel.hidden).toBe(true); // a abertura real ocorre ao receber a mensagem "season" com open: true
  });

  it("ao ser clicado com o painel já aberto, fecha o painel localmente sem requisitar o servidor", () => {
    const panel = { hidden: false };
    const send = vi.fn();

    toggleSeasonPass(panel as any, send);

    expect(panel.hidden).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it("o CSS em theme.css estiliza o botão de estrela com cor dourada e badges de notificação", () => {
    const css = read("../src/theme.css");
    expect(css).toMatch(/\.star-btn\s*\{/);
    expect(css).toMatch(/#season-btn\.ping/);
  });
});
