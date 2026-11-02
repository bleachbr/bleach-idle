# PRD: Social avançado (M3-01 a M3-04)

| Metadado | Detalhe |
| :--- | :--- |
| **Feature** | Troca direta, abas de chat, filtro de loot do Auto Helper e banco de guilda |
| **Status** | Aceito em 01/11/2026 por Rafael e Waldir: Waldir aprovou o PR #28 ([revisão](https://github.com/bleachbr/bleach-idle/pull/28#pullrequestreview-5729185927)), e Rafael confirmou o aceite. As propostas dos pontos em aberto valem como decisão até alguém reabrir |
| **Itens do roadmap** | M3-01, M3-02, M3-03, M3-04 (M3-05, moderação de chat, já está feito e tem spec própria em `docs/features/moderacao-chat/`) |
| **ADRs** | [ADR-001 troca direta](adrs/ADR-001-troca-direta.md) · [ADR-002 abas de chat](adrs/ADR-002-abas-de-chat.md) · [ADR-003 filtro de loot](adrs/ADR-003-filtro-de-loot.md) · [ADR-004 banco de guilda](adrs/ADR-004-banco-de-guilda.md) |

---

## 1. Problema

Conferido no código em 01/11/2026 (`server/src/WorldRoom.ts`, `guilds.ts`, `market.ts` e `client/src/main.ts` da `main` desse dia):

- **Não existe troca entre jogadores.** Para passar um item a um amigo do lado, é preciso anunciar no Mercado do Kisuke (taxa de 5%, `server/src/market.ts`) e torcer para ninguém comprar antes.
- **O chat é uma janela só.** Local, `/pm`, `/p`, `/g`, avisos de sistema, lore de evento e o log de combate (loot, XP, dano) caem no mesmo `#chatlog`, com limite de 200 linhas (`client/src/main.ts`, `chatLine`). Numa caçada em party, a conversa some em segundos.
- **O Auto Helper pega todo o loot.** A Auto Venda só vende o que não coube no inventário (`giveLoot`), então o jogador de nível alto enche a mochila de lixo de monstro fraco.
- **O banco de guilda só guarda kan**, só o líder saca, e há dois cargos (`lider`, `membro` em `server/src/guilds.ts`). Depósito e saque não entram na auditoria de economia (W-08), e o depósito ignora o retorno de `guilds.addBank`.

## 2. Objetivos

1. **M3-01 Troca direta:** dois jogadores lado a lado trocam itens e kan sem taxa, com duas confirmações e sem risco de golpe nem de duplicação.
2. **M3-02 Abas de chat:** Geral, Combate, Party, Guilda e Privado, cada uma com o próprio histórico e aviso de mensagem nova.
3. **M3-03 Filtro de loot:** por item, o jogador escolhe pegar, vender na hora ou deixar no chão. Vale também na caçada offline.
4. **M3-04 Banco de guilda:** itens e kan, com cargos Líder, Oficial e Membro e permissões por cargo, tudo auditado.

Fora do escopo: leilão (horizonte de expansão), banco de conta entre personagens, chat entre servidores.

## 3. Regras de produto

### 3.1. Troca direta (M3-01)
- Pedido pelo menu do jogador (clicar no personagem: "Propor troca") ou `/trocar Nome`.
- Os dois precisam estar **online, vivos, no mesmo mapa e a até 2 tiles** (`INTERACT_RANGE`). A troca cai se alguém se afastar, mudar de mapa, morrer ou sair.
- Não pode trocar quem está em duelo, na fila ou na contagem da arena, no desafio do Dangai, com caveira (☠) ou com o bloqueio de PvP ativo: os dois últimos são o critério do `travelBlocked` (para não fugir com o saque de um assassinato); fila da arena e Dangai entram à parte (ADR-001 §2.2).
- Cada lado oferece até **8 itens do inventário** (não do equipamento nem do depot) e um valor em kan.
- **Duas confirmações:**
  1. "Pronto": a oferta trava. Qualquer mudança de qualquer lado destrava os dois.
  2. "Confirmar": quando os dois confirmam, o servidor executa a troca de uma vez ou não executa nada.
- Sem taxa (a taxa do mercado existe porque o mercado cria liquidez; a troca é entre duas pessoas que se acharam).
- Pedido sem resposta expira em 30 s; troca aberta sem confirmar, em 2 min.

### 3.2. Abas de chat (M3-02)
- **Geral:** chat local (hoje vai para todos os jogadores da sala, de qualquer mapa), avisos de sistema e lore de evento.
- **Combate:** o log do personagem (`log`: loot, XP, dano, morte). Respostas de comando e avisos da moderação, que também chegam como `log`, aparecem ainda na aba em que o jogador escreveu (ADR-002).
- **Party** e **Guilda:** só o canal. Escrever na aba já manda para o canal (sem digitar `/p` ou `/g`).
- **Privado:** `/pm`. Escrever responde à última pessoa da conversa.
- Cada aba guarda até 200 linhas. A aba fechada mostra um contador de mensagens novas.
- A aba aberta fica salva no navegador.

### 3.3. Filtro de loot (M3-03)
- Na janela do Auto Helper, uma lista dos itens que o personagem já viu cair (bestiário e inventário), cada um com três opções: **Pegar** (padrão), **Vender** (vira kan pelo preço da loja na hora em que cai) e **Ignorar** (não entra no inventário).
- Atalhos: "Vender todo loot puro" e "Pegar tudo".
- A regra vale para o loot que vai para o inventário e para a sacola de quem não coube. Vale também na caçada offline.
- Caixas do Kisuke, Pedras de Reishi e equipamentos podem ser filtrados, mas o padrão é sempre Pegar.

### 3.4. Banco de guilda (M3-04)
- O banco fica no **baú do depot** (é preciso estar perto, como o depot pessoal) e tem **40 espaços** de item mais o kan.
- **Cargos:** Líder (um), Oficial e Membro. O líder promove e rebaixa oficiais.
- **Permissões:**
  - Depositar item ou kan: todos.
  - Sacar item ou kan: Líder e Oficial. O oficial tem limite por dia (padrão 10 itens e 5.000 kan), que o líder ajusta.
  - Ver o histórico dos últimos 50 movimentos: todos.
- O comando `/guilda depositar N` continua funcionando; `/guilda sacar N` passa a valer também para oficiais.

## 4. Requisitos funcionais

- **RF01** O servidor é a autoridade de toda troca e todo movimento de banco: distância, estado do jogador, posse do item, espaço e saldo.
- **RF02** A troca só executa se, no momento da segunda confirmação, cada item oferecido ainda estiver no mesmo espaço do inventário, com a mesma quantidade ou mais, e se os dois inventários tiverem espaço para o que recebem.
- **RF03** Todo movimento de kan e de item da troca e do banco de guilda gera linha em `economy_audit` (W-08), um registro por item e por kan, de cada lado.
- **RF04** Troca e banco gravam no banco de dados na hora (não esperam o save de 10 s), na mesma transação que muda os dois lados.
- **RF05** As preferências do filtro de loot ficam no save do personagem, com padrão em `fromSave` para saves antigos.
- **RF06** Nenhuma aba de chat usa `innerHTML` com texto de jogador.

## 5. Requisitos não funcionais

- **RNF01** Mensagens novas entram por `this.handle`, em `registerTradeMessages` e `registerGuildMessages` próprios (o `WorldRoom.ts` é zona de atrito). A lógica pura (validar oferta, aplicar troca, permissões de cargo) fica em módulo testável em `shared/` ou `server/src/`.
- **RNF02** Cada mudança tem teste que falha sem ela, com instantes fixos para expiração (skill `testes-deterministicos`), e cenário novo (`trade`, `guildbank`, `lootfilter`).
- **RNF03** Handler sensível (itens, kan): revisão do Waldir (regra 6 do `roadmap-duplas.md`).

## 6. Ordem sugerida de entrega

1. **M3-02** (só cliente, sem risco de economia).
2. **M3-03** (servidor e cliente, sem movimento entre jogadores).
3. **M3-04** (depende de passar o `guilds.ts` para a mesma conexão do `db.ts`, ADR-004).
4. **M3-01** (usa a mesma transação do M3-04).

## 7. Pontos em aberto

| # | Pergunta | Proposta |
| :-- | :--- | :--- |
| 1 | Nível mínimo para trocar (contra contas descartáveis passando itens) | 10, o mesmo de criar guilda |
| 2 | Limite de kan por troca ou por dia | Sem limite agora; olhar a auditoria depois do primeiro mês |
| 3 | O banco de guilda some quando a guilda acaba? | Os itens vão para o depot do último membro e o resto em cartas de até 10 espaços (ADR-004 §2.5); o kan, como hoje, volta a quem saiu por último |
| 4 | Filtro de loot vale para a party (o loot vai para quem matou) | Sim: é a regra de quem recebeu o item |
| 5 | Abas: Combate mostra também o dano recebido? | Sim, tudo o que hoje é `log` |
| 6 | Respostas de comando num canal próprio (`ch: "notice"`) no servidor, em vez da regra dos 2 s do cliente (ADR-002)? | Decisão do Waldir: mexe em muitas chamadas de `this.log` |
