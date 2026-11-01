# ADR-001: Arquitetura do Motor de Status por Tick em `shared/src/combatStatus.ts`

**Status:** Aceito — 31/10/2026 (Waldir)  
**Contexto:** `M2-01` a `M2-05`

## Decisão

1. **Funções puras e determinísticas em `shared/src/combatStatus.ts`:**
   - Isolar toda a matemática e transição de estado de efeitos de status (`applyStatus`, `tickStatuses`, `canEntityMove`, `canEntityAct`, `effectiveStepMs`, `formatStatusFlags`) em funções puras que recebem `now: number`.
   - Isso permite testar todas as bordas de expiração, ticks de DoT, bloqueio de ação (`stun`), bloqueio de passo (`freeze`) e multiplicador de `stepMs` (`slow`) de forma 100% determinística sem `setTimeout`.
2. **Integração enxuta no `WorldRoom.ts` e `schema.ts`:**
   - Cada `Player` e `Monster` possui `statuses: StatusMap = {}` (apenas no servidor) e `statusFlags = ""` (sincronizado via Colyseus Schema para `M2-06`).
   - No início de `updatePlayer` e `updateMonster`, `this.processStatuses(entity, now)` avança o relógio de status, aplica os ticks de `dot` vencidos e atualiza `statusFlags` apenas quando o conjunto ativo muda.
