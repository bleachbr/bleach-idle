# ADR-001: Consolidação do Relatório Offline em Módulo Compartilhado e Snapshot em `offlineState.ts`

**Status:** Aceito — 31/10/2026 (Waldir)  
**Contexto:** `W-05`

## Decisão

1. **Módulo Compartilhado Puro (`shared/src/offlineReport.ts`):**
   - Extraímos a montagem e a matemática do relatório para uma função pura `buildOfflineReport(input: OfflineReportInput): OfflineReport`.
   - Limita o cálculo de rendimento ao teto de 12 horas (`OFFLINE_MAX_MS`), calculando `killsPerHour` e `expPerHour` de forma determinística e testável.
2. **Encapsulamento de Persistência (`server/src/offlineState.ts`):**
   - Unificamos a captura de snapshot (`snapshotOffline`) e restauração (`restoreOffline`) de `offlineSince`, `expAtLeave`, `goldAtLeave`, `zanAtLeave`, `reiAtLeave`, `offKills`, `offKinds`, `offItems` e `offlineDeaths`.
   - Evita duplicação nos três pontos de ciclo de vida: saída do jogador (`onLeave`), boot do servidor (`restoreWorld`) e login/reconexão (`onJoin`).
3. **Compatibilidade com o Cliente:**
   - A mensagem de rede `"offline"` mantém os campos legados para consumo no cliente atual e anexa o objeto `report` enriquecido para suportar futuras interfaces e modais detalhados.
