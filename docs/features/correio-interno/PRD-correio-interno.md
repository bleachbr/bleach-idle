# PRD: Correio interno (W-07)

**Status:** Aceito — 31/10/2026 (Waldir)

## Problema
Recompensas, itens devolvidos pelo mercado e avisos do sistema só chegavam com o jogador online. Anúncio expirado com depot cheio ficava preso no mercado indefinidamente.

## Entrega
- Cartas por personagem no SQLite (`mailbox`) com anexo opcional (kan e itens), validade de 30 dias e limite de 50 por caixa (as mais antigas saem).
- Retirada atômica e de uso único; o anexo precisa caber no inventário, senão a carta permanece.
- Comandos `/correio` (lista) e `/correio retirar <id>`; mensagens `mailList` e `mailTake` para o cliente (UI fica para a fila de Rafael).
- Aviso de cartas pendentes ao entrar no mundo.
- Mercado: anúncio expirado com depot cheio é entregue por carta, em vez de ficar preso.

## Critérios de aceite
- [x] Só o destinatário lista e retira; segunda retirada não entrega nada.
- [x] Carta expira em 30 dias; caixa limitada a 50.
- [x] Teste determinístico em `server/test/mailbox.test.ts` (falhava antes do módulo existir).

## Fora de escopo
Envio entre jogadores (spam/abuso exige moderação própria) e UI do cliente: ver `docs/pendencias.md`.
