# ADR-004: Banco de guilda com itens e permissões por cargo (M3-04)

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto. Rascunho do Rafael em 01/11/2026 |
| **Contexto** | [PRD Social avançado](../PRD-social-avancado.md) §3.4 |

---

## 1. Contexto

`server/src/guilds.ts` tem as tabelas `guilds` (com `bank INTEGER`, só kan) e `guild_members` (cargo `lider` ou `membro`). `addBank` é um `UPDATE ... WHERE bank + ? >= 0`. A guilda é controlada só por comandos de chat (`guildCommand` no `WorldRoom.ts`). Conferido em 01/11/2026:
- `/guilda depositar` faz `p.gold -= n` e ignora o retorno de `guilds.addBank`.
- Depósito, saque e o reembolso de quem sai não entram na auditoria (W-08).
- `setLeader` usa `BEGIN`/`COMMIT` sem `ROLLBACK`.
- `guilds.ts` abre a própria conexão SQLite, separada do `db.ts`.

## 2. Decisão

### 2.1. Dados
- Tabela nova `guild_items (guild_id, slot, item, qty)`, chave `(guild_id, slot)`, 40 espaços (`GUILD_BANK_SLOTS`).
- Cargo novo `oficial` em `guild_members.rank`.
- Limite do oficial em tabela própria `guild_withdrawals (guild_id, account_id, day, units, gold)`, com `day` = `dayKey` (dia de Brasília, como a diária). Conta **unidades**, não pilhas (10 pilhas de 100 seriam 1.000 unidades), e conta **por conta**, não por personagem: dois personagens da mesma conta como oficiais dividem o mesmo limite. Fica fora de `guild_members` porque o `addMember` usa `INSERT OR REPLACE`, que zeraria o contador de quem sai e volta.
- Colunas novas em `guilds` para o limite (padrão 10 unidades e 5.000 kan por dia). Migração aditiva (`ALTER TABLE ... ADD COLUMN` com padrão).
- `guilds.ts` (e o `mailbox.ts`, que entrega os itens no fim da guilda) passam a usar a conexão do `db.ts` (a mesma decisão do ADR-001, com o mesmo teste em arquivo temporário), para que o banco da guilda, o save do personagem, a carta e a auditoria fiquem na mesma transação.
- `setLeader` hoje faz `UPDATE guild_members SET rank = 'membro' WHERE guild_id = ?`: com oficiais, cada troca de líder (inclusive a automática quando o líder sai) rebaixaria todos. Passa a rebaixar só o líder antigo, e ganha `ROLLBACK` pelo `transaction(fn)`.

### 2.2. Permissões
Função pura `guildCan(rank, action)` em `shared/src/`:

| Ação | Líder | Oficial | Membro |
| :--- | :-- | :-- | :-- |
| Depositar item ou kan | sim | sim | sim |
| Sacar item ou kan | sim | sim, até o limite do dia | não |
| Promover ou rebaixar oficial, mudar o limite | sim | não | não |
| Ver histórico | sim | sim | sim |

### 2.3. Protocolo
Handlers novos em `registerGuildMessages`, todos com `near(p, "depot")`:
- `guildBank` (abre a janela) → `guildBank { slots, gold, rank, limits, log }`
- `guildDeposit { index, qty }`, `guildWithdraw { slot, qty }`: o índice validado como no `depot` (`idx()`), e `qty` inteiro de 1 até a quantidade do espaço (o `depot` de hoje move a pilha inteira e não tem `qty`)
- `guildGold { op: "put" | "take", n }`: `n` inteiro seguro > 0
- `guildRank { id, rank }`: `rank` em lista fixa; só o líder

### 2.4. Execução
Cada movimento roda numa transação (`db.transaction`): atualiza `guild_items` ou `guilds.bank` com guarda (`changes > 0`), grava o save do personagem e a auditoria (`guild_deposit`, `guild_withdraw`). Só depois a memória do personagem muda (a mesma ordem do mercado). Os comandos de chat `depositar` e `sacar` passam a usar o mesmo caminho, o que conserta o retorno ignorado e a falta de auditoria.

### 2.5. Fim da guilda
Quando a guilda acaba, os itens do banco não podem ir numa carta só: o `takeMail` só retira a carta se todo o anexo couber no inventário (20 espaços), e o `mailbox.send` apaga as cartas mais antigas acima de 50, com anexo e tudo. Então:
- os itens vão para o **depot** do último membro que saiu, até onde couber;
- o que sobrar vai em cartas de até 10 espaços cada;
- o corte do `MAX_INBOX` passa a pular cartas com anexo (mudança no `mailbox.ts`, com teste).
O kan continua voltando para quem saiu por último, como hoje.

### 2.6. Concorrência
Dois oficiais sacando o último item ao mesmo tempo: o segundo falha pela guarda `changes > 0`, porque o servidor é um processo só e os handlers são síncronos. Se o mundo for partido em processos (M5-04), a guarda precisa continuar no banco de dados (ela já está no `UPDATE`).

## 3. Consequências

- **Positivas:** sem duplicação entre banco e personagem; permissões testáveis; conserta dois débitos do código atual.
- **Negativas:** migração de tabela e troca de conexão no `guilds.ts`, em PR próprio antes do banco de itens.
- **Testes:** `guildCan`, limites do dia com instante fixo (virada de dia em Brasília, unidades contra pilhas, dois personagens da mesma conta), depósito e saque com inventário e banco cheios, dois oficiais sacando o último item ao mesmo tempo (só um consegue), troca de líder que mantém os oficiais, fim de guilda com banco cheio, cenário `guildbank`.
