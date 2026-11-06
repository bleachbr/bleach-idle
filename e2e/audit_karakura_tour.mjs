import { chromium } from "playwright";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const ARTIFACTS_DIR = "/Users/wjunior/Library/Application Support/orca/antigravity-chat/antigravity-acp/brain/f0b24ba8-f97a-4187-a0a6-16c7b6d17d76";

async function main() {
  console.log("Iniciando auditor Playwright do Mundo Expandido...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("PAGE CONSOLE ERROR:", msg.text());
  });

  console.log("Navegando para http://localhost:5173...");
  await page.goto("http://localhost:5173");

  const rand = Math.floor(Math.random() * 100000);
  const suffix = Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
  const login = `audit_${suffix}`;
  
  await page.fill("#login-name", login);
  await page.fill("#login-pass", "senha-auditor-123");
  await page.click('#auth-form button[value="register"]');

  await page.waitForSelector("#lobby", { timeout: 10000 });
  console.log("Lobby aberto!");

  const heroName = `Auditor ${suffix}`;
  await page.fill("#new-name", heroName);
  await page.click('#chars button.char:has-text("Recruta (M)")');
  await page.click('#create-form button[type="submit"]');

  await page.waitForSelector('#char-list .char-row', { timeout: 10000 });
  console.log("Personagem criado com sucesso!");

  await page.click('#char-list .char-row button:has-text("Jogar")');
  await page.waitForSelector("#app", { timeout: 10000 });
  await page.waitForSelector("#game-loading.ready", { timeout: 15000 });
  console.log("Entrou no mundo em Karakura!");

  await page.waitForTimeout(3000);

  // Helper para mover o personagem e esperar a camera
  async function walkTo(targetX, targetY, desc, shotName) {
    console.log(`\n--- Navegando para: ${desc} (${targetX}, ${targetY}) ---`);
    await page.evaluate(async ({ x, y }) => {
      const room = window.__bi?.room;
      if (room) {
        room.send("move", { x, y });
      }
    }, { x: targetX, y: targetY });

    // Aguarda o personagem caminhar até perto do destino
    let reached = false;
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(400);
      const pos = await page.evaluate(() => {
        const p = window.__bi?.room?.state?.players?.get(window.__bi?.room?.sessionId);
        return p ? { x: p.x, y: p.y } : null;
      });
      if (pos) {
        const dist = Math.hypot(pos.x - targetX, pos.y - targetY);
        if (dist <= 2.5) {
          reached = true;
          break;
        }
      }
    }

    await page.waitForTimeout(1000);
    const shotPath = `${ARTIFACTS_DIR}/${shotName}`;
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log(`Captura salva: ${shotName}`);
  }

  // 1. Ponto de Spawn e Praça do Templo (16, 15)
  await walkTo(16, 15, "Ponto de Spawn & Praça Inicial", "audit_01_spawn_temple.png");

  // 2. Loja Urahara & Senkaimon (18, 12)
  await walkTo(18, 12, "Loja Urahara & Senkaimon", "audit_02_urahara_shop.png");

  // 3. Clínica Kurosaki (21, 19)
  await walkTo(21, 19, "Clínica Kurosaki (Fachada e Escala)", "audit_03_kurosaki_clinic.png");

  // 4. Distrito Residencial e Apartamentos (6, 19)
  await walkTo(6, 19, "Condomínio de Apartamentos e Beco Residencial", "audit_04_apartments_residential.png");

  // 5. Cruzamento de Ruas e Mobiliário Urbano (14, 24)
  await walkTo(14, 24, "Cruzamento de Ruas, Postes e Bancos", "audit_05_street_props_details.png");

  // 6. Bosque Leste e Árvores Zelkova (36, 11)
  await walkTo(36, 11, "Bosque Leste & Campo de Treinamento", "audit_06_east_forest_zelkova.png");

  // 7. Beira-Rio Onagawa e Travessia da Ponte (18, 38)
  await walkTo(18, 38, "Parque Beira-Rio Onagawa & Ponte", "audit_07_onagawa_river_bridge.png");

  // 8. Periferia Industrial Abandonada (50, 38)
  await walkTo(50, 38, "Periferia Industrial & Ruínas Fabris", "audit_08_industrial_periphery.png");

  console.log("\nAuditoria e tour fotográfico concluídos com sucesso!");
  await browser.close();
}

main().catch((err) => {
  console.error("Erro no script de auditoria:", err);
  process.exit(1);
});
