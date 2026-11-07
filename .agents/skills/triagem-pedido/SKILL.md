---
name: triagem-pedido
description: >
  Gate antes de feature nova no Soul Survivor: mapa, personagem, sistema,
  modo de jogo. Use quando o pedido ainda não está no código. Não use para
  bugfix localizado nem para item que já é uma caixa de docs/ROADMAP.md.
---

# Triagem de pedido

Cinco perguntas, nesta ordem. A primeira que responder encerra. Não abra doc novo antes do fim.

1. **Já está no código ou no changelog?** `docs/STATUS.md` e `docs/_arquivo/changelog-entregas.md`. Se sim, aponte o lugar e pare.
2. **Já está no plano ou na dívida?** `docs/ROADMAP.md` e `docs/pendencias.md`. Se sim, a conversa é prioridade, não arquivo novo.
3. **Já foi tentado e a causa está registrada?** `docs/aprendizados.md`. Se sim, só reabre com evidência nova, citada no item.
4. **Fere invariante?** Câmera e billboard, normalização de sprite, FX por configuração. Os três estão em `AGENTS.md`. Se sim, o pedido precisa revogar o invariante por escrito em `docs/direcionamento/` antes de código.
5. **Passou.** Uma linha na seção Radar de `docs/ROADMAP.md`: data, `aceito`, `adiado` ou `recusado`, e o motivo. Aí sim o destino:
   - incerteza de abordagem: nota curta em `docs/direcionamento/`, não um segundo roadmap
   - entrega óbvia: uma caixa nova na frente certa do ROADMAP
   - decisão com perda aceita: parágrafo no STATUS apontando o direcionamento, não um ADR solto na raiz

Não crie `ENTREGAS_ROADMAP.md` de novo, nem `TODO.md`, nem checklist dentro do README.
