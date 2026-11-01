# PRD: Motor de Status e Controle de Grupo no Combate (M2-01 a M2-05)

**Status:** Aceito — 31/10/2026 (Waldir)  
**Itens do Roadmap:** `M2-01`, `M2-02`, `M2-03`, `M2-04`, `M2-05`

---

## 1. Problema e Contexto

Até o marco M1, todas as técnicas dos 8 personagens diferiam apenas em alcance (`range`), área (`area`), custo de reiatsu (`cost`), tempo de recarga (`cdMs`) e multiplicador de dano instantâneo (`mult`). Isso limitava a identidade mecânica de personagens de controle (Rukia e Hitsugaya com gelo, Sado e Byakuya com impacto/Kidō) e de dano contínuo (Kenpachi e Renji).

## 2. Objetivos (`M2-01..05`)

1. **M2-01 — Motor de status por tick no servidor:**
   - Suportar efeitos temporários com expiração determinística por timestamp (`until`) avaliados a cada tick (`100 ms`) em jogadores e monstros.
   - Sincronizar os status ativos em `statusFlags` no Schema (`Player` e `Monster`) e emitir evento visual `fx` (`t: "status"`) para consumo pelo cliente (`M2-06`).
2. **M2-02 — Congelamento (`freeze`):**
   - Técnicas de gelo de **Rukia** (*Some no Mai: Tsukishiro*, *Zero Absoluto*) e **Hitsugaya** (*Hyōryū Senbi*, *Ryūsenka: Flor de Gelo*) congelam o alvo, impedindo sua movimentação (`canEntityMove = false`) pela duração.
3. **M2-03 — Lentidão (`slow`):**
   - Técnicas iniciais de gelo de **Rukia** (*Tsugi no Mai: Hakuren*) e **Hitsugaya** (*Hyōryū: Dragão de Gelo*, *Guncho Tsurara*) aplicam lentidão, aumentando o `stepMs` efetivo do alvo (ex.: `1.5x`).
4. **M2-04 — Dano ao longo do tempo (`dot`):**
   - Técnicas de corte/fogo de **Kenpachi** (*Reiatsu Esmagador*, *Nozarashi: Corte do Céu*) e **Renji** (*Hihiō Zabimaru: Fogo Total*) aplicam dano periódico a cada `1000 ms` proporcional ao dano do golpe inicial.
5. **M2-05 — Atordoamento (`stun`):**
   - Técnicas de impacto/paralisia de **Sado** (*Golpe do Gigante*, *Puño del Diablo*) e **Byakuya** (*Hadō 4: Byakurai*) atordoam o alvo, bloqueando movimento, ataques corpo a corpo e conjuração de técnicas (`canEntityAct = false`, `canEntityMove = false`).

## 3. Regras de Negócio e Balanceamento

- **Renovação sem empilhamento infinito:** reaplicar o mesmo tipo de status (`freeze`, `slow`, `dot`, `stun`) renova a duração (`Math.max(existing.until, now + durationMs)`) e preserva o maior valor de efeito (`slowMult` ou `dotDmg`).
- **Proteção de Zona Segura (PZ) e Boneco de Treino:** jogadores dentro de PZ ou com `devGod` não sofrem dano de `dot`, e `boneco` (`dummy`) não fica imobilizado/morto por status.
- **Limpeza ao morrer:** morrer limpa todos os status ativos da entidade.
