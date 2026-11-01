# PRD: Motor de Chefes com Fases (W-04)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Item do Roadmap:** `W-04` (base para chefe mundial, `M4-02`, `W-12`, `W-15`, `R-03`, `R-04`)

---

## 1. Problema e Contexto

Os chefes de mapa (`grand_fisher`, `gillian`, `privaron`, `ayon`, `yhwach`) e o Chefe Mundial (`menos_anciao`) possuíam comportamento estático do início ao fim da luta (`100%` a `0%` de HP). Faltava um motor declarativo de fases que alterasse atributos (`atkMult`, `defMult`, `stepMult`), anunciasse a transição narrativa e aplicasse controle de grupo em área ao cruzar limiares de vida.

## 2. Objetivos

1. **Catálogo Declarativo de Fases (`shared/src/bossPhases.ts`):**
   - Definir limiares decrescentes de HP (`hpPct`) para os chefes do jogo (`grand_fisher`, `gillian`, `privaron`, `ayon`, `menos_anciao`, `yhwach`).
   - Cada fase especifica `phase` (`1..N`), `hpPct`, `label`, `shout`, `atkMult`, `defMult`, `stepMult` e opcionalmente pulso de status em área (`aoeStatus`, `aoeRadius`).
2. **Transição Autoritativa no Servidor (`WorldRoom.ts` e `schema.ts`):**
   - Sincronizar `phase` (`uint8`) no Schema `Monster`.
   - Ao sofrer dano direto ou de DoT (com `hp > 0`), avaliar `evaluateBossPhase(m.kind, m.phase, m.hp, m.maxHp)`, atualizar poder/defesa/velocidade do chefe, emitir efeito visual/sonoro (`fx`) e aplicar pulso de status nos jogadores próximos.

## 3. Critérios de Aceite

- [x] `evaluateBossPhase` transita apenas para frente (`phase > currentPhase`), suportando saltos de fase caso um único golpe atravesse dois limiares.
- [x] Monstro morto (`hp <= 0`) não dispara transição de fase.
- [x] `Monster.phase` é sincronizado no Colyseus Schema e os multiplicadores (`atkMult`, `defMult`, `stepMult`) escalam a partir dos atributos base do monstro (sem acumular exponencialmente entre fases).
