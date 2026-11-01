# ADR-001: Arquitetura e Cálculo Determinístico das Patrulhas Idle (W-13)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Decisores:** Waldir (Tech Lead), Antigravity Agent

---

## Contexto

O item W-13 adiciona expedições de patrulha assíncronas ("idle patrols") que concedem EXP, Kan, fragmentos e itens após um intervalo de 1 a 12 horas.
Precisamos decidir onde residem os dados de setores e balanceamento, como o tempo e as recompensas são computados e como o estado é persistido.

## Decisões Tomadas

1. **Catálogo e Fórmulas Compartilhadas (`shared/src/patrols.ts`):**
   - Os setores (`PATROL_SECTORS`), durações válidas (`PATROL_DURATIONS = [1, 4, 8, 12]`) e o cálculo de recompensas ficam em `shared/`.
   - O cálculo é uma função pura: `calculatePatrolRewards(sectorId, durationHours, playerLevel, options)`.
   - A geração de itens determinística utiliza semente pseudo-aleatória estável baseada no início da patrulha e identificador do personagem (`seed = (startedAt ^ charSeed) >>> 0`), evitando RNG flutuante entre cliente e servidor.

2. **Persistência em `Progress.patrol`:**
   - Adicionamos o campo opcional `patrol?: PatrolState | null` no tipo `Progress` (`shared/src/data.ts`).
   - `PatrolState`: `{ sectorId, durationHours, startedAt, completedAt, partyBonus }`.
   - Isso garante que o estado da patrulha é salvo e carregado automaticamente pelo ciclo de persistência existente do SQLite (`db.save` / `db.load`).

3. **Validação de Autoridade do Servidor (`WorldRoom.ts`):**
   - O cliente envia apenas intenções (`patrolStart`, `patrolClaim`, `patrolCancel`).
   - O servidor confere nível mínimo (`player.level >= sector.minLevel`), impede sobreposição de patrulhas, verifica espaço livre no inventário antes de entregar itens (`spaceFor`) e registra transações na auditoria econômica (`recordAudit`).

4. **Isolamento Temporal para Testes:**
   - `completedAt = startedAt + durationHours * 3600_000`.
   - Funções de resgate e cálculo aceitam timestamp explícito `nowMs` para permitir testes unitários determinísticos instantâneos, sem necessidade de delays reais ou manipulação perigosa de timers globais.

## Consequências

- **Positivas:**
  - Código desacoplado e 100% testável.
  - Zero duplicação de regras entre cliente e servidor.
  - Baixo consumo de CPU: nenhuma tarefa roda em background enquanto a patrulha ocorre; tudo é avaliado sob demanda no momento do resgate (`patrolClaim`).
- **Cuidados:**
  - Garantir que `Progress.patrol` venha inicializado como `null` ou `undefined` em personagens novos via `newProgress()`.
