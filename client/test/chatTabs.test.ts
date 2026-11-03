import { describe, it, expect } from "vitest";
import { ChatBook, CHAT_MAX, REPLY_WINDOW_MS, parseTab, tabOf, pmTarget } from "../src/chatTabs";

// M3-02 (ADR-002 do Social avançado): abas de chat só no cliente
describe("canal de cada mensagem", () => {
  it("chat local, sys e lore vão para Geral; log para Combate; pm, party e guild para as abas deles", () => {
    expect(tabOf("chat")).toBe("geral");
    expect(tabOf("chat", "sys")).toBe("geral");
    expect(tabOf("chat", "lore")).toBe("geral");
    expect(tabOf("log")).toBe("combate");
    expect(tabOf("chat", "pm")).toBe("privado");
    expect(tabOf("chat", "party")).toBe("party");
    expect(tabOf("chat", "guild")).toBe("guilda");
  });

  it("canal desconhecido, inclusive chave de protótipo, vai para Geral", () => {
    expect(tabOf("chat", "notice")).toBe("geral");
    expect(tabOf("chat", "constructor")).toBe("geral");
    expect(tabOf("chat", "__proto__")).toBe("geral");
  });

  it("a aba salva no navegador só vale se for uma das cinco", () => {
    expect(parseTab("party")).toBe("party");
    expect(parseTab("toString")).toBe("geral");
    expect(parseTab(null)).toBe("geral");
  });
});

describe("histórico e não lidas", () => {
  it("cada aba guarda até 200 linhas, as mais novas", () => {
    const b = new ChatBook();
    for (let i = 0; i < CHAT_MAX + 5; i++) b.add("chat", undefined, { text: `m${i}`, cls: "" }, 0);
    expect(b.lines.geral.length).toBe(CHAT_MAX);
    expect(b.lines.geral[0].text).toBe("m5");
  });

  it("aba fechada conta não lidas, e abrir zera", () => {
    const b = new ChatBook();
    b.add("chat", "party", { text: "oi", cls: "party" }, 0);
    b.add("chat", "party", { text: "bora", cls: "party" }, 0);
    b.add("chat", undefined, { text: "local", cls: "" }, 0);
    expect(b.unread.party).toBe(2);
    expect(b.unread.geral).toBe(0); // Geral é a aberta
    b.setActive("party");
    expect(b.unread.party).toBe(0);
  });
});

describe("resposta de comando", () => {
  it("log que chega até 2 s depois de enviar aparece também na aba aberta", () => {
    const b = new ChatBook();
    b.setActive("privado");
    b.sent(1000);
    const tabs = b.add("log", undefined, { text: "Fulano não está online.", cls: "log" }, 1000 + REPLY_WINDOW_MS);
    expect(tabs).toEqual(["combate", "privado"]);
    expect(b.lines.privado.map((l) => l.text)).toEqual(["Fulano não está online."]);
  });

  it("depois da janela, o log fica só no Combate", () => {
    const b = new ChatBook();
    b.setActive("party");
    b.sent(1000);
    expect(b.add("log", undefined, { text: "loot", cls: "log" }, 1000 + REPLY_WINDOW_MS + 1)).toEqual(["combate"]);
    expect(b.lines.party).toEqual([]);
  });
});

describe("envio pela aba", () => {
  it("Party e Guilda põem o comando do canal; texto com / sai como está", () => {
    const b = new ChatBook();
    b.setActive("party");
    expect(b.outgoing("vamos")).toEqual({ text: "/p vamos" });
    expect(b.outgoing("/ignorar Zé")).toEqual({ text: "/ignorar Zé" });
    b.setActive("guilda");
    expect(b.outgoing("boa noite")).toEqual({ text: "/g boa noite" });
    b.setActive("geral");
    expect(b.outgoing("oi")).toEqual({ text: "oi" });
  });

  it("Privado responde à última pessoa da conversa, recebida ou enviada", () => {
    const b = new ChatBook();
    b.setActive("privado");
    expect(b.outgoing("oi")).toHaveProperty("error");
    b.add("chat", "pm", { text: "Rukia: oi", cls: "pm" }, 0, "Rukia");
    expect(b.outgoing("tudo bem?")).toEqual({ text: "/pm Rukia, tudo bem?" });
    // o eco do que eu mandei chega com "para Nome"
    b.sent(10, "/pm Renji, e aí");
    b.add("chat", "pm", { text: "para Renji: e aí", cls: "pm" }, 20, "para Renji");
    expect(b.outgoing("bora caçar")).toEqual({ text: "/pm Renji, bora caçar" });
  });

  it("jogador chamado \"para X\" não desvia a resposta para X", () => {
    const b = new ChatBook();
    b.setActive("privado");
    // ninguém mandou /pm para Renji: "para Renji" é o nome de quem escreveu
    b.add("chat", "pm", { text: "para Renji: oi", cls: "pm" }, 0, "para Renji");
    expect(b.outgoing("quem é?")).toEqual({ text: "/pm para Renji, quem é?" });
  });
});

describe("respostas fora da aba", () => {
  it("/ajuda (chat sys) respondido em até 2 s aparece também na aba aberta", () => {
    const b = new ChatBook();
    b.setActive("party");
    b.sent(1000, "/ajuda");
    expect(b.add("chat", "sys", { text: "Comandos: ...", cls: "sys" }, 1500)).toEqual(["geral", "party"]);
  });

  it("falar pela aba Combate mostra o eco ali, e não só em Geral", () => {
    const b = new ChatBook();
    b.setActive("combate");
    b.sent(1000, "oi");
    expect(b.add("chat", undefined, { text: "Eu: oi", cls: "" }, 1100)).toEqual(["geral", "combate"]);
  });

  it("party e guilda de outros não vazam para a aba aberta", () => {
    const b = new ChatBook();
    b.setActive("geral");
    b.sent(1000, "oi");
    expect(b.add("chat", "party", { text: "Rukia: oi", cls: "party" }, 1100)).toEqual(["party"]);
  });
});

describe("pmTarget e aliases de sussurro", () => {
  it("extrai destinatário com /pm, /w, /s, /msg, /tell, /whisper e /sussurro", () => {
    expect(pmTarget("/pm Renji, e aí")).toBe("Renji");
    expect(pmTarget("/w Rukia, socorro")).toBe("Rukia");
    expect(pmTarget("/s Byakuya olá")).toBe("Byakuya");
    expect(pmTarget("/msg Chad, venha cá")).toBe("Chad");
    expect(pmTarget("/tell Uryu teste")).toBe("Uryu");
    expect(pmTarget("/whisper Orihime, tudo bem?")).toBe("Orihime");
    expect(pmTarget("/sussurro Kenpachi luta")).toBe("Kenpachi");
  });
});
