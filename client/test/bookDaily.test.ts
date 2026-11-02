import { describe, it, expect } from "vitest";
import { dailyTabHtml, claimPendingLabel, type DailyView } from "../src/bookDaily";

const REWARDS = Array.from({ length: 7 }, (_, i) => ({ gold: 100 * (i + 1) }));
const view = (over: Partial<DailyView> = {}): DailyView => ({ claimed: false, streak: 0, index: 0, rewards: REWARDS, ...over });
const MISSIONS = `<h3>Missões de hoje</h3><div class="ach">Hollow Menor: derrote 30</div>`;

// #23: com as três missões do dia, o botão ficava abaixo da área visível do #book-body (que rola)
// e o clique caía no chat; a recompensa de entrada vem antes das missões
describe("aba Diário do Livro (#23)", () => {
  it("o botão de pegar a recompensa vem antes das missões", () => {
    const html = dailyTabHtml(view(), MISSIONS);
    const claim = html.indexOf(`class="claim"`);
    expect(claim).toBeGreaterThanOrEqual(0);
    expect(claim).toBeLessThan(html.indexOf("Missões de hoje"));
  });

  it("já resgatada: botão desabilitado com o motivo", () => {
    const html = dailyTabHtml(view({ claimed: true, streak: 1 }), MISSIONS);
    expect(html).toMatch(/<button type="button" class="claim" disabled[^>]*>Já pegou hoje<\/button>/);
  });

  it("pendente: botão habilitado com o texto de pegar", () => {
    expect(dailyTabHtml(view(), MISSIONS)).toMatch(/<button type="button" class="claim" >Pegar a recompensa de hoje<\/button>/);
  });

  it("marca os dias já pegos e o de hoje", () => {
    const html = dailyTabHtml(view({ claimed: true, streak: 3, index: 2 }), MISSIONS);
    expect(html.match(/class="got/g)?.length).toBe(3);
    expect(html.match(/ today"/g)?.length).toBe(1);
  });

  it("dá retorno imediato ao clicar, antes da resposta do servidor", () => {
    expect(claimPendingLabel).toBeTruthy();
    expect(claimPendingLabel).not.toBe("Pegar a recompensa de hoje");
  });
});
