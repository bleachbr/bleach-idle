// Janela de opções, preferências e atalhos fora dos campos (R-14, PR 1: RF-01 a RF-03 e RF-08).
// Troca o antigo smoke que ficava em .git/: cada teste cria a própria conta.
import { test, expect, type Page } from "@playwright/test";
import { newPlayer, suffix } from "./helpers";

/** Texto das mensagens que o cliente mandou pelo WebSocket (msgpack: o nome do tipo aparece nos bytes). */
function watchSent(page: Page) {
  const sent: string[] = [];
  page.on("websocket", (ws) => ws.on("framesent", (f) => sent.push(Buffer.from(f.payload).toString("latin1"))));
  return (word: string) => sent.some((s) => s.includes(word));
}

/** Fala no chat e espera ela voltar: o servidor já viu tudo que o cliente mandou antes dela. */
async function flush(page: Page) {
  const mark = `fim${suffix()}`;
  await page.locator("#chatin").focus();
  await page.keyboard.type(mark);
  await page.keyboard.press("Enter");
  await expect(page.locator("#chatlog")).toContainText(mark);
}

const prefsBoxes = (page: Page) => page.locator("#options-body input[type=checkbox]");

test("⚙ abre a janela, o som acompanha o ícone e a escolha fica gravada", async ({ page }) => {
  await newPlayer(page);
  await expect(page.locator("#options-btn")).toHaveAttribute("aria-label", "Opções");
  await page.click("#options-btn");
  await expect(page.locator("#options")).toBeVisible();
  await expect(page.locator("#options-body legend")).toHaveText(["Visual", "Som"]);
  await expect(prefsBoxes(page).nth(0)).not.toBeChecked(); // HD desligado
  await expect(prefsBoxes(page).nth(1)).toBeChecked(); // som ligado

  await prefsBoxes(page).nth(1).uncheck();
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "mute");
  const stored = await page.evaluate(() => ({ prefs: localStorage.getItem("bi.prefs"), mute: localStorage.getItem("bi_mute") }));
  expect(JSON.parse(stored.prefs ?? "{}").mute).toBe(true);
  expect(stored.mute).toBe("1"); // a chave antiga continua gravada por compatibilidade (ADR-001 §2.2)

  await page.click("#options-body fieldset:nth-of-type(2) button"); // Voltar ao padrão
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "sound");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bi.prefs"))).toBe('{"hd":false,"mute":false}');
});

test("Enter no botão Voltar ao padrão aciona o botão e não foca o chat", async ({ page }) => {
  await newPlayer(page);
  await page.click("#options-btn");
  await prefsBoxes(page).nth(1).uncheck(); // som desligado
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "mute");
  await page.locator("#options-body fieldset:nth-of-type(2) button").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "sound");
  await expect(page.locator("#chatin")).not.toBeFocused();
});

test("Enter no botão ⚙ abre a janela de opções e não foca o chat", async ({ page }) => {
  await newPlayer(page);
  await page.locator("#options-btn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#options")).toBeVisible();
  await expect(page.locator("#chatin")).not.toBeFocused();
});

test("Espaço na caixa de marcar não manda interagir ao jogo", async ({ page }) => {
  const sentHas = watchSent(page);
  await newPlayer(page); // nasce na praça, perto do Kisuke e da loja: Espaço fora de um campo mandaria "interact"
  await page.click("#options-btn");
  await prefsBoxes(page).nth(1).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "mute"); // a caixa mudou
  await flush(page);
  expect(sentHas("interact")).toBe(false);
});

test("o Esc fecha a janela e abrir outra janela fecha a de opções", async ({ page }) => {
  await newPlayer(page);
  await page.click("#options-btn");
  await page.keyboard.press("Escape");
  await expect(page.locator("#options")).toBeHidden();
  await page.click("#options-btn");
  await page.click("#book-btn");
  await expect(page.locator("#book")).toBeVisible();
  await expect(page.locator("#options")).toBeHidden();
});

test("sem bi.prefs, as chaves antigas viram as preferências novas", async ({ page }) => {
  await newPlayer(page);
  await page.evaluate(() => { localStorage.removeItem("bi.prefs"); localStorage.setItem("bi_hd", "1"); localStorage.setItem("bi_mute", "1"); });
  await page.reload();
  await expect(page.locator("#lobby")).toBeVisible(); // "Lembrar" vem marcado: a sessão continua
  await page.locator("#char-list .char-row").getByRole("button", { name: "Jogar" }).click();
  await expect(page.locator("#app")).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("bi.prefs"))).toBe('{"hd":true,"mute":true}');
  await expect(page.locator("#mute-btn")).toHaveAttribute("data-ico", "mute");
  await expect(page.locator("#hd-btn")).toHaveClass(/\bon\b/);
});

test("Esc e Enter no chat ficam no chat", async ({ page }) => {
  await newPlayer(page);
  await page.click("#book-btn");
  await expect(page.locator("#book")).toBeVisible();

  await page.locator("#chatin").focus();
  await page.keyboard.press("Escape");
  await expect(page.locator("#chatin")).not.toBeFocused();
  await expect(page.locator("#book")).toBeVisible(); // o Esc do chat não fecha a janela

  await page.locator("#chatin").focus();
  await page.keyboard.type(`teste ${suffix()}`);
  await page.keyboard.press("Enter");
  await expect(page.locator("#chatin")).not.toBeFocused(); // o Enter que envia não foca o chat de novo
});

test("com a lista do local de caça focada o R não chega ao jogo; com o controle deslizante, chega", async ({ page }) => {
  const sentHas = watchSent(page);
  await newPlayer(page);
  await flush(page);

  await page.locator("#hunt-spot").focus();
  await page.keyboard.press("KeyR");
  await flush(page);
  expect(sentHas("recall")).toBe(false);

  await page.locator("#auto-heal").focus();
  await page.keyboard.press("KeyR");
  await expect.poll(() => sentHas("recall")).toBe(true);
});

test("as setas ajustam o controle deslizante do Auto Helper e ele continua focado", async ({ page }) => {
  await newPlayer(page);
  const heal = page.locator("#auto-heal");
  await heal.focus();
  const before = await heal.inputValue();
  await page.keyboard.press("ArrowRight");
  await expect(heal).not.toHaveValue(before);
  await expect(heal).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(heal).toHaveValue(before);
});

test("os ícones do cabeçalho ficam dentro da barra, do desktop ao celular de 360 px", async ({ page }) => {
  await newPlayer(page);
  await page.click("#options-btn"); // o ⚙ é a única entrada da janela: precisa estar à vista
  for (const [width, height] of [[1280, 720], [414, 800], [360, 740]]) {
    await page.setViewportSize({ width, height });
    const m = await page.evaluate(() => {
      const side = document.querySelector("#side") as HTMLElement;
      const cs = getComputedStyle(side);
      const limit = side.getBoundingClientRect().right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight);
      const rights = Array.from(document.querySelectorAll(".who-icons button")).filter((b) => (b as HTMLElement).offsetParent).map((b) => b.getBoundingClientRect().right);
      return { limit, maxRight: Math.max(...rights), scrollLeft: side.scrollLeft };
    });
    expect(m.maxRight, `${width}px`).toBeLessThanOrEqual(m.limit + 0.5);
    expect(m.scrollLeft, `${width}px`).toBe(0);
  }
});
