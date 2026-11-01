# PRD: Caçada Offline v2 — Resumo Detalhado e Métricas por Hora (W-05)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Item do Roadmap:** `W-05` (Fila Waldir)

---

## 1. Problema e Contexto

No sistema original de caçada offline, ao retornar ao jogo (`onMessage("offline")`), o jogador recebia apenas números brutos agregados (`exp`, `gold`, `minutes`, `deaths`, `items`), sem discriminação dos monstros abatidos, sem taxas de rendimento por hora (`expPerHour`, `killsPerHour`), sem distinção entre tempo ausente e tempo útil caçado (quando o jogador ficava mais de 12 horas fora) e sem separação de perdas causadas por mortes. Além disso, a contagem de abates por tipo de monstro não era persistida em `players.data.offline`.

## 2. Objetivos

1. **Estrutura de Relatório Consolidado (`shared/src/offlineReport.ts`):**
   - Calcular tempo ausente (`awayMinutes`) e tempo efetivo de caçada (`huntMinutes`, limitado a 12 horas / `OFFLINE_MAX_MS`).
   - Indicar se a caçada foi encerrada por tempo (`stopped: boolean`).
   - Apresentar abates totais e top 5 tipos de monstros abatidos (`topKills`), com nomes legíveis e contagem de outros tipos (`otherKinds`).
   - Apresentar taxa de rendimento por hora: `expPerHour` e `killsPerHour`.
   - Discriminar perdas decorrentes de mortes (`expLost`, `goldLost`, `deathCount`).
   - Entregar lista estruturada de itens obtidos com nomes e quantidades.
2. **Persistência Confiável no SQLite (`server/src/offlineState.ts`):**
   - Rastrear e salvar em `SaveData.offline` os abates por tipo (`kinds: Record<string, number>`), mantendo compatibilidade retroativa com saves antigos que não possuíam o campo.
   - Preservar o estado ao reiniciar o servidor ou ao reconectar.

## 3. Critérios de Aceite

- [x] Testes unitários puros cobrindo o cálculo do relatório (`shared/test/offlineReport.test.ts`).
- [x] Testes de persistência de estado offline (`server/test/offlineState.test.ts`).
- [x] Retrocompatibilidade mantida: saves sem `kinds` ou `zanAtLeave`/`reiAtLeave` são preenchidos com padrões sem distorcer o relatório.
- [x] O payload do evento `offline` enviado pelo Colyseus inclui o objeto `report` estruturado mantendo compatibilidade com as propriedades antigas (`minutes`, `exp`, `gold`, `kills`, etc.).
