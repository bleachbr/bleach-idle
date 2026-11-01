# ADR-001: Motor Declarativo de Fases de Boss em `shared/src/bossPhases.ts`

**Status:** Aceito — 31/10/2026 (Waldir)  
**Contexto:** `W-04`

## Decisão

1. **Avaliação pura e idempotente (`evaluateBossPhase`):**
   - `BOSS_PHASES` guarda a lista de fases ordenada por `phase` crescente (`hpPct` decrescente).
   - `evaluateBossPhase(kind, currentPhase, hp, maxHp)` retorna a fase mais avançada cujo `hp / maxHp <= phase.hpPct` (desde que `phase > currentPhase` e `hp > 0`), ou `null` se nenhuma transição ocorreu.
2. **Escala sobre atributos base (`basePower` e `baseStepMs`):**
   - Para evitar que a Fase 2 multiplique em cima do valor já multiplicado pela Fase 1, `Monster` armazena `basePower` (que preserva a escala do Chefe Mundial ou Dangai) e `baseStepMs`, aplicando `m.power = m.basePower * transition.atkMult` e `m.stepMs = Math.round(m.baseStepMs * transition.stepMult)`.
