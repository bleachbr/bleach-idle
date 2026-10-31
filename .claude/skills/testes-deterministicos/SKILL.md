---
name: testes-deterministicos
description: Escreve e corrige testes do Bleach Idle sem flakiness (Vitest em server/test e shared/test, cenários em server/scripts). Use ao criar teste, ao corrigir bug com teste de regressão, ao investigar CI instável ou vermelho, ou quando o resultado muda com o dia da semana, o fuso, a velocidade da máquina ou a ordem de execução.
---

# Testes determinísticos

Um teste que passa ou falha conforme o relógio, o fuso ou a velocidade da máquina não prova nada. Neste projeto o CI já ficou vermelho por isso mais de uma vez: espera fixa de 300 ms (Bankai, segundo a mensagem do commit que o corrigiu), bot de teste fraco demais para a área (idem) e XP em dobro no fim de semana (verificado no log).

## As duas camadas
| Camada | Comando | O que roda | Tempo medido |
|---|---|---|---|
| Vitest | `npm test` | 10 arquivos, 83 testes: lógica de `shared/` e servidor Colyseus real em memória (`server/test/helpers/testServer.ts`, banco `:memory:`) | cerca de 1,3 s |
| Cenários | `npm run test:scripts` | 31 cenários, cerca de 314 verificações, servidor isolado na porta 2577 com banco temporário | cerca de 7 min local, 9 min no CI |

Rodar só alguns cenários: `cd server && npx tsx scripts/test.ts social rebirth`.
Ordem de trabalho: `npm run typecheck`, `npm test`, cenários afetados, bateria completa antes do PR.

## Regras
1. **Espere por condição, nunca por tempo.** Use `await vi.waitFor(() => expect(estado).toBe(x), { timeout: 5000, interval: 25 })` (conferido no Vitest 5.0.5) ou o helper `once(room, "tipo")`. Sobraram `sleep(200)` em `e2e-world-gameplay.test.ts` (2) e `e2e-lobby-and-world.test.ts` (1): troque ao mexer neles. Nos cenários, se o resultado depende do `sleep`, troque por laço com predicado (modelo: o laço de `rebirth.ts` que espera a linha do abate no log).
2. **O relógio é uma entrada.** `Date.now()` decide XP em dobro (`xpWeekend`, sábado e domingo em Brasília), `dayKey`, temporada, invasão e chefe mundial. Funções de `shared/` recebem `ms`: teste com timestamps fixos. Em cenário ao vivo, calcule o esperado com a mesma função do servidor (`xpWeekend(...) ? WEEKEND_EXP : 1`), consultada no início e no fim do cenário, e aceite os dois valores se a virada de dia cair no meio. Como a função do servidor e o esperado usam a mesma regra, mantenha também um teste de unidade com instantes fixos (`shared/test/season.test.ts`). Os cenários `social` e `rebirth` falharam em 31/10/2026 (sábado) por assumirem XP simples. A causa era determinística, não instabilidade do CI.
3. **Fuso é ambiente.** Rode lógica de data com `TZ=Asia/Tokyo` e `TZ=America/Los_Angeles` antes de confiar. Aritmética sobre o instante UTC (como `dayKey`) é imune; `getDay()`, `setHours()` e `getFullYear()` dependem do fuso do processo. A função `currentWeekKey` da primeira versão do ADR-002 só acertava com o processo em UTC.
4. **Teste contra o framework de verdade.** Use o servidor Colyseus real e o SQLite em memória; troque só o que fica fora do processo (relógio, rede externa). Não faça mock de `Room`, `Client` nem do banco: o mock devolve o que você supõe e esconde justamente o bug que o teste deveria achar.
5. **Personagens de teste compatíveis com a área.** Nível e equipamento que sobrevivam aos monstros (a "Ana" morria no nível 8; os cenários usam nível 25). `patchSave` zera as missões diárias; sem equipamento quando a conta de XP precisa ser exata (o uniforme inicial dá +5%).
6. **Todo teste precisa poder falhar.** Para bug: escreva o teste, veja-o falhar pelo motivo certo, só então corrija. Não use `skip` nem apague teste para ficar verde; se remover, diga onde o comportamento passou a ser coberto.
7. **Saída limpa.** O Vitest imprime `colyseus.js: onMessage() not registered for type ...`. Registre os tipos no helper; com ruído constante, o aviso real passa despercebido.
8. **CI vermelho não é culpa do PR até provar.** Compare com as execuções da `main` (`gh run list --workflow ci.yml`) e leia o log (`gh run view ID --log-failed`).

## Ciclo para uma mudança
1. Liste os casos: caminho feliz, entrada inválida, limite, falha de dependência.
2. Um teste por vez: vermelho, mínimo para verde, refatorar com tudo verde.
3. Rode o menor conjunto que prova a mudança e depois o maior.
4. Relate o que rodou e o que não rodou.
