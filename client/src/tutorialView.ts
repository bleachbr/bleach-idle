// Renderização e mapeamento de ações interativas para o painel de Primeiros Passos (Lote 4).

export interface TutorialStepData {
  id?: string;
  text: string;
  done: boolean;
}

const escHtml = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export function tutorialAction(act: string): "toggleAutoHunt" | "openBook" | "openTravel" | "transform" | null {
  switch (act) {
    case "auto": return "toggleAutoHunt";
    case "book": return "openBook";
    case "travel": return "openTravel";
    case "bankai": return "transform";
    default: return null;
  }
}

export function renderTutorialStep(step: TutorialStepData): string {
  const isDone = step.done;
  let actionHtml = "";

  if (!isDone) {
    const act = step.id ?? "";
    const txt = step.text.toLowerCase();

    if (act === "auto" || txt.includes("auto hunt")) {
      actionHtml = `<button type="button" class="tut-act" data-act="auto" title="Atalho: tecla H">Ligar Auto Hunt (H)</button>`;
    } else if (act === "daily" || txt.includes("livro") || txt.includes("diária")) {
      actionHtml = `<button type="button" class="tut-act" data-act="book" title="Atalho: tecla L">Abrir Livro (L)</button>`;
    } else if (act === "shop" || act === "quest" || txt.includes("kisuke")) {
      actionHtml = `<button type="button" class="tut-act" data-act="travel" title="Viajar até o Kisuke (Atalho: E ou Espaço na praça)">Ir ao Kisuke</button>`;
    } else if (act === "bankai" || txt.includes("bankai")) {
      actionHtml = `<button type="button" class="tut-act" data-act="bankai" title="Atalho: tecla T">Bankai (T)</button>`;
    } else if (act === "kill" || txt.includes("derrote")) {
      actionHtml = `<span class="tut-hint">Atalho: Tab para mirar</span>`;
    }
  }

  return `
    <div class="tut${isDone ? " done" : ""}">
      <div class="tut-header">
        <span class="tut-check">${isDone ? "✔" : "○"}</span>
        <span class="tut-text">${escHtml(step.text)}</span>
      </div>
      ${actionHtml}
    </div>
  `.trim();
}
