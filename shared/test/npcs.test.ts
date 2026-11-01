import { describe, it, expect } from "vitest";
import { NPCS, NPC_BY_ID, npcById, npcNode, chronicleDialog, isChronicleNode, CHRONICLE_START, type ChronicleQuestState } from "../src/npcs";
import { CHRONICLES, SPRITES } from "../src";

describe("catálogo de NPCs (M1-02, ADR-001)", () => {
  it("tem os 3 NPCs do PRD §4, com ids únicos e sprites que existem", () => {
    expect(NPCS.map((n) => n.id).sort()).toEqual(["npc_cronista", "npc_sentinela", "npc_shunsui"]);
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(NPCS.length);
    for (const n of NPCS) {
      expect(SPRITES[n.sprite], `${n.id}: ${n.sprite}`).toBeDefined();
      expect(n.name).not.toBe("");
      expect(n.title).not.toBe("");
    }
  });

  it("todo diálogo começa num nó que existe e todo 'next' leva a um nó que existe", () => {
    for (const n of NPCS) {
      expect(npcNode(n, n.start), `${n.id}: início`).toBeDefined();
      for (const node of n.nodes) {
        expect(node.text.trim(), `${n.id}/${node.id}`).not.toBe("");
        expect(node.options.length, `${n.id}/${node.id}`).toBeGreaterThan(0);
        for (const o of node.options) {
          expect(o.label.trim()).not.toBe("");
          // "chr:*" é a crônica da semana: só no NPC que a apresenta, e só para o começo dela
          if (o.action === "next" && isChronicleNode(o.nextDialogId)) expect(n.chronicle && o.nextDialogId === CHRONICLE_START, `${n.id}/${node.id}`).toBe(true);
          else if (o.action === "next") expect(npcNode(n, o.nextDialogId), `${n.id}/${node.id} -> ${o.nextDialogId}`).toBeDefined();
          else expect(o.nextDialogId).toBeUndefined();
        }
      }
    }
  });

  it("todo nó tem saída: dá para fechar a conversa de qualquer ponto em poucos passos", () => {
    for (const n of NPCS) {
      for (const node of n.nodes) {
        let cur = node, steps = 0;
        while (!cur.options.some((o) => o.action === "close") && steps++ < n.nodes.length) {
          cur = npcNode(n, cur.options.find((o) => o.action === "next")!.nextDialogId)!;
        }
        expect(cur.options.some((o) => o.action === "close"), `${n.id}/${node.id}`).toBe(true);
      }
    }
  });

  it("os NPCs comuns não aceitam nem entregam missão; só a Maki apresenta a crônica", () => {
    expect(NPCS.filter((n) => n.chronicle).map((n) => n.id)).toEqual(["npc_cronista"]);
    for (const n of NPCS) for (const node of n.nodes) for (const o of node.options) expect(["next", "close"]).toContain(o.action);
  });

  it("busca com chave da rede é segura (own)", () => {
    expect(npcById("npc_cronista")?.name).toBe("Maki");
    expect(npcById("constructor")).toBeUndefined();
    expect(npcById("__proto__")).toBeUndefined();
    expect(npcById(42)).toBeUndefined();
    expect(NPC_BY_ID.npc_shunsui?.name).toBe("Shunsui Kyōraku");
    expect(npcNode(NPCS[0], "__proto__")).toBeUndefined();
    expect(npcNode(NPCS[0], 42)).toBeUndefined();
  });
});

describe("diálogo da crônica semanal (Maki)", () => {
  const c = CHRONICLES[0];

  it("conta as páginas da crônica em ordem e termina na missão da semana", () => {
    for (let i = 0; i < c.pages.length; i++) {
      const node = chronicleDialog(c.id, "available", `chr:${i}`)!;
      expect(node.text).toBe(c.pages[i]);
      expect(node.options[0]).toEqual({ label: "Continuar", action: "next", nextDialogId: i + 1 < c.pages.length ? `chr:${i + 1}` : "chr:quest" });
      expect(node.options[1].action).toBe("close");
    }
    const quest = chronicleDialog(c.id, "available", "chr:quest")!;
    expect(quest.text).toContain(c.quest.name);
    expect(quest.text).toContain(c.quest.desc);
  });

  it("a Maki leva até a crônica, e dá para sair em qualquer página", () => {
    const maki = npcById("npc_cronista")!;
    expect(npcNode(maki, maki.start)!.options.some((o) => o.nextDialogId === CHRONICLE_START)).toBe(true);
    expect(chronicleDialog(c.id, "available", CHRONICLE_START)).toBeDefined();
    for (let i = 0; i < c.pages.length; i++) expect(chronicleDialog(c.id, "active", `chr:${i}`)!.options.some((o) => o.action === "close")).toBe(true);
  });

  it("as opções do fim dependem do estado da missão, que o servidor decide", () => {
    const actions = (s: ChronicleQuestState) => chronicleDialog(c.id, s, "chr:quest")!.options.map((o) => o.action);
    expect(actions("available")).toEqual(["quest_accept", "close"]);
    expect(actions("active")).toEqual(["close"]);
    expect(actions("ready")).toEqual(["quest_claim", "close"]);
    expect(actions("done")).toEqual(["close"]);
  });

  it("crônica, nó ou estado desconhecido não gera diálogo", () => {
    expect(chronicleDialog("nao_existe", "available", "chr:0")).toBeUndefined();
    expect(chronicleDialog(c.id, "available", "chr:99")).toBeUndefined();
    expect(chronicleDialog(c.id, "available", "chr:-1")).toBeUndefined();
    expect(chronicleDialog(c.id, "available", "outro")).toBeUndefined();
    expect(chronicleDialog(c.id, "hackeado" as ChronicleQuestState, "chr:quest")).toBeUndefined();
  });
});
