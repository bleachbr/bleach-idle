# ADR-002: Abas de chat no cliente (M3-02)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Social avançado](../PRD-social-avancado.md) §3.2 |

---

## 1. Contexto

O servidor já separa os canais: mensagem `chat` com `ch` = `pm`, `party`, `guild`, `sys` ou `lore`, e sem `ch` no chat local. O log do personagem é outra mensagem (`log`). O cliente junta tudo num `#chatlog` só (`chatLine` em `client/src/main.ts`), com `textContent` e limite de 200 linhas. Uma exceção: o aviso "X entrou no mundo." sai sem `ch` e com `from: ""`, e o cliente o trata como `sys` porque não tem remetente.

## 2. Decisão

- **Só cliente.** O servidor não muda: o canal já vem na mensagem.
- Módulo novo `client/src/chatTabs.ts`, puro (sem DOM), com o mapeamento canal → aba e o histórico por aba (até 200 linhas cada, contador de não lidas):
  - Geral: sem `ch` (o chat "local" de hoje vai para todos os jogadores da sala, de qualquer mapa), `sys`, `lore`
  - Combate: mensagem `log`
  - Party: `party` · Guilda: `guild` · Privado: `pm`
  - Canal desconhecido vai para Geral (o servidor pode criar canal novo sem quebrar o cliente).
- **Respostas de comando.** A mensagem `log` não é só combate: leva também as respostas de comando ("X não está online") e o motivo de silenciamento da moderação (`checkChatMessage` → `this.log`). Quem escreve na aba Party ou Privado não pode ter a resposta escondida na aba Combate. Regra: o `log` que chega até 2 s depois de o jogador enviar algo pela caixa de chat aparece **também** na aba ativa. É uma heurística de cliente; a alternativa limpa é o servidor mandar essas respostas num canal próprio (`ch: "notice"`), que mexe em dezenas de chamadas de `this.log` e fica como ponto aberto para o Waldir.
- O DOM ganha uma barra de abas acima do `#chatlog`. Trocar de aba redesenha o histórico daquela aba com `textContent`.
- **Envio pela aba:** na aba Party, o texto sai como `/p texto`; na Guilda, `/g texto`; no Privado, `/pm Nome, texto` para a última pessoa da conversa. Texto que já começa com `/` sai como está. O servidor valida como hoje (`command`, `checkChatMessage`).
- A aba aberta fica em `localStorage` (`bi.chatTab`), lida com lista fixa de valores.

## 3. Consequências

- **Positivas:** sem risco de economia nem de segurança no servidor; a lógica de abas tem teste em `client/test/` (pasta criada pelo M2-06, PR #16, com o `statusFx.test.ts`).
- **Negativas:** o histórico por aba fica só na memória do navegador (recarregar a página limpa, como hoje). A regra dos 2 s pode mostrar na aba ativa um `log` que não era resposta (por exemplo, um loot que chegou junto).
- **Testes:** mapeamento de canal, limite de 200 por aba, contador de não lidas, prefixo de envio e a janela de 2 s com instantes fixos, no Vitest.
