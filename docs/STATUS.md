# Status

Fotografia do protótipo. Plano em [ROADMAP.md](ROADMAP.md). O que já entrou no registro, em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md).

**Última atualização:** 2026-11-07

<!-- docs:progress:start -->
Gerado por `make docs-sync` a partir das caixas de `docs/ROADMAP.md`. Não edite este bloco à mão.

| Frente | Abertos | Entregues |
|---|---:|---:|
| Frente 0 — já está no código | 0 | 5 |
| Frente 1 — aceite da versão 1 | 5 | 0 |
| Frente 2 — versão 2 | 5 | 0 |
| Frente 3 — engenharia do protótipo | 3 | 0 |
| Radar | 0 | 0 |
| **Total** | **13** | **5** |
<!-- docs:progress:end -->

## Agora

O checkout é o protótipo **Bleach: Soul Survivor** (Three.js, Vite, arena, billboards). O remoto e o CI ainda carregam o jogo anterior **bleach-idle**: o `package.json` só tem `dev`, `build` e `preview`, e `.github/workflows/ci.yml` cobra `typecheck`, `npm test`, um workspace `e2e` e deploy de `bleach-idle`. Isso está na pendência 1. Não tratar o workflow como descrição deste protótipo.

No código de `src/main.js` já existem arena, câmera orbital, horda (Fishbone, Shrieker, Acidwire, com HP e velocidade diferentes), reishi, level-up com cartas, armas, boss Menos Grande aos 120 s ou 60 abates, e tela de fim com tempo, nível, abates, dano, censo e dano por arma. Ichigo shikai em 8 frames está em `src/assets/characters/ichigo_shikai/`. FX configurável está em `src/fx/`.

Ninguém registrou, neste status, uma partida jogada de ponta a ponta com evidência. A frente 1 do roadmap continua aberta por isso.

## Fora deste status

Direção de câmera, sprite e FX: [direcionamento/](direcionamento/01-engenharia-reversa-pokebonk.md). Dívidas: [pendencias.md](pendencias.md). Pegadinhas: [aprendizados.md](aprendizados.md).
