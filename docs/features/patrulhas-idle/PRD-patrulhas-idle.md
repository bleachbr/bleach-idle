# PRD: Patrulhas Idle de Hollows (W-13)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Item do Roadmap:** `W-13` (Fila Waldir)

---

## 1. Problema e Motivação

No modelo atual do Bleach Idle, a progressão offline depende exclusivamente de o personagem permanecer "deslogado" no mapa onde estava caçando (Auto Hunt offline). Entretanto:
1. Jogadores não possuem uma forma de despachar expedições secundárias enquanto jogam ativamente ou durante intervalos prolongados.
2. Não existia um gerador de progressão assíncrona com escolha estratégica de setor, tempo de retorno e mitigação de risco com recompensas regionais (fragmentos de Hollow, pedras de reishi e materiais específicos de Karakura, Rukongai e Hueco Mundo).
3. A fantasia shinigami de "patrulhar distritos e vigiar portais" contra incursões de Hollows era apenas passiva.

## 2. Objetivos e Requisitos

1. **Catálogo de Setores de Patrulha (`PATROL_SECTORS` em `shared/src/patrols.ts`):**
   - Setores canônicos com nível mínimo de acesso:
     - `karakura_periferia` (Nível 1+)
     - `rukongai_distritos` (Nível 15+)
     - `floresta_menos` (Nível 35+)
     - `deserto_hueco_mundo` (Nível 60+)
   - Rendimento base balanceado de EXP e Kan por hora, fragmentos de Hollow e pool de itens temáticos de cada região.

2. **Durações e Eficiência:**
   - Opções de despacho: `1 h`, `4 h`, `8 h` e `12 h`.
   - Bônus de eficiência de longa duração: +5% (4h), +15% (8h) e +25% (12h) para incentivar planejamento idle.
   - Bônus de cooperação de Grupo / Party (+15% em recompensas caso o jogador esteja em grupo ativo ao iniciar a patrulha).

3. **Cálculo Determinístico e Puro (`calculatePatrolRewards`):**
   - Toda recompensa é calculada por função pura e determinística em `shared/src/patrols.ts`, sem dependência do relógio de sistema nem números randômicos não-semeados.
   - Fórmulas imunes a adulteração e testáveis com instantes e níveis fixos.

4. **Persistência Confiável no Servidor:**
   - Estado de patrulha guardado na estrutura de progresso do personagem (`Progress.patrol`), sobrevivendo a desconexões e reinício do servidor.
   - Trilha de auditoria (W-08) acionada na entrega de recompensas (`recordAudit` de kan e itens com motivo `patrol_reward`).

5. **Interface de Rede (Protocolo Colyseus):**
   - `patrolList`: envia o estado da patrulha atual e os setores disponíveis.
   - `patrolStart`: `{ sectorId, durationHours }` inicia a patrulha se elegível.
   - `patrolClaim`: coleta as recompensas se a duração tiver sido concluída e o inventário tiver espaço.
   - `patrolCancel`: cancela a patrulha ativa sem recompensas.

## 3. Critérios de Aceite

- [x] Setores e fórmulas implementados em `shared/src/patrols.ts` com validação de chaves via `lookup.ts` (`own`).
- [x] Tipagem completa e estado persistido em `shared/src/data.ts`.
- [x] Teste determinístico escrito primeiro comprovando início, cálculo de recompensa por tempo decorrido, bônus de party e resgate com espaço no inventário.
- [x] Handlers de rede no `WorldRoom.ts` com validação estrita de autoridade do servidor.
- [x] Registro na trilha de auditoria econômica de W-08.
