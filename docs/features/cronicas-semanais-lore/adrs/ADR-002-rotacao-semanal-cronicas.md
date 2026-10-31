# ADR 002: Rotação Determinística e Persistência do Ciclo Semanal de Crônicas

| Metadado | Detalhe |
| :--- | :--- |
| **Status** | Proposto |
| **Data** | 2026-10-31 |
| **Autor** | Time de Engenharia Bleach Idle |
| **Contexto Técnico** | Cronograma de eventos, sincronia temporal e persistência |

---

## 1. Contexto e Problema

O projeto necessita exibir acontecimentos da história de Bleach em uma **rotação semanal**.
Os principais desafios técnicos são:
1. **Evitar Cron Jobs ou Timers no Servidor:** Processos dependentes de `cron` ou `setInterval` longo podem falhar durante reinícios ou gerar descompassos caso o servidor seja pausado.
2. **Determinismo Temporal:** Qualquer cliente ou servidor (incluindo ambientes de teste) deve ser capaz de saber exatamente qual crônica está ativa para qualquer timestamp `Date.now()` fornecido.
3. **Persistência Confiável:** Um jogador que conclui a missão na semana não deve conseguir coletar a recompensa novamente na mesma semana, mas deve ter a nova missão liberada assim que o ciclo virar.

---

## 2. Decisão Arquitetural

### 2.1. Cálculo Matemático Puro do Ciclo Semanal (`shared/src/chronicles.ts`)
Implementaremos o cálculo do evento ativo via função pura, sem estado:

```typescript
export const TOTAL_CRONICAS = 5;
export const MS_PER_WEEK = 7 * 24 * 3600 * 1000;

// Âncora temporal alinhada a uma segunda-feira 00:00 UTC-3 (Horário de Brasília)
export const CHRONICLE_EPOCH = Date.UTC(2026, 9, 26, 3, 0, 0); // Ex: Segunda-feira 26/10/2026 00:00 BRT

export function weekIndex(now = Date.now()): number {
  const diff = now - CHRONICLE_EPOCH;
  const weeks = Math.floor(diff / MS_PER_WEEK);
  return ((weeks % TOTAL_CRONICAS) + TOTAL_CRONICAS) % TOTAL_CRONICAS;
}

export function currentWeekKey(now = Date.now()): string {
  const d = new Date(now - 3 * 3600 * 1000); // offset Brasília UTC-3
  // Retorna identificador ISO de semana, ex: "2026-W44"
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}
```

### 2.2. Persistência de Progresso em SQLite (`shared/src/progress.ts` e `server/src/db.ts`)
A estrutura `ProgressData` receberá um mapa de histórico de crônicas:
```typescript
export interface ChronicleProgress {
  activeWeekKey: string;
  questKills: number;
  completedAt?: number;
}
```
- A chave `activeWeekKey` guarda a semana em que a missão foi aceita.
- Se `currentWeekKey() !== p.prog.chronicle.activeWeekKey`, o servidor detecta automaticamente a virada de semana e reinicia o contador de tarefas sem necessidade de rotina batch de banco de dados.

---

## 3. Consequências

### Positivas:
- **Zero Custo de CPU em Background:** Não há necessidade de processos em background acordando para virar a semana.
- **Resiliente a Reinícios:** Como o cálculo é derivado diretamente do relógio do sistema, reiniciar o servidor ou migrar de máquina nunca dessincroniza a crônica ativa.
- **Testes Determinísticos Simples:** Em testes automatizados do Vitest, basta passar um timestamp específico para testar todas as 5 semanas em milissegundos.

### Negativas / Mitigações:
- *Alteração do relógio do SO:* O relógio da máquina do servidor deve estar sincronizado via NTP (padrão em qualquer servidor Linux/Docker de produção).
