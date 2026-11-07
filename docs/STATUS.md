# Status

Fotografia do protótipo. Plano em [ROADMAP.md](ROADMAP.md). O que já entrou no registro, em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md).

**Última atualização:** 2026-11-07

<!-- docs:progress:start -->
Gerado por `make docs-sync` a partir das caixas de `docs/ROADMAP.md`. Não edite este bloco à mão.

| Frente | Abertos | Entregues |
|---|---:|---:|
| Frente 0 — já está no código | 0 | 6 |
| Frente 1 — aceite da versão 1 | 0 | 5 |
| Frente 2 — versão 2 | 6 | 0 |
| Frente 3 — engenharia do protótipo | 3 | 0 |
| Radar | 0 | 0 |
| **Total** | **9** | **11** |
<!-- docs:progress:end -->

## Agora

O checkout é o protótipo **Bleach: Soul Survivor** (Three.js, Vite, arena, billboards). O remoto e o CI ainda carregam o jogo anterior **bleach-idle**: o `package.json` só tem `dev`, `build` e `preview`, e `.github/workflows/ci.yml` cobra `typecheck`, `npm test`, um workspace `e2e` e deploy de `bleach-idle`. Isso está na pendência 1. Não tratar o workflow como descrição deste protótipo.

No código de `src/main.js` e `src/maps/hueco_mundo.js` o cenário oficial da V1 é o **Hueco Mundo** (relevo 3D de dunas procedurais com heightmap, lua crescente, atmosfera noturna e 99 props canônicos de quartzo e ruínas de Las Noches com colisão física). O jogador e os hollows acompanham dinamicamente o desnível do terreno e o pulo vertical com gravidade. O estúdio 360° em `preview_map.html` inspeciona malhas, wireframes e colisores. Câmera orbital, horda unificada de Hollows Fishbone D e Chefão Menos Grande Gillian em `walk8` (8 frames e 4 direções), reishi, level-up com banner em tempo real e cartas substituíveis, armas com Getsuga Tenshō teleguiado devastador, boss Menos Grande individual aos 120 s ou 60 abates, tela de vitória com estatísticas e reinício em memória sem reload. Ichigo shikai em 8 frames normalizado está em `src/assets/characters/ichigo_shikai/`. FX configurável está em `src/fx/`. Tela de login PokéBonk ativa em `src/menu.js`.

A partida completa de ponta a ponta foi executada, validada e documentada com evidências de 9 telas em `_arquivo/changelog-entregas.md`. Os controles virtuais touch para mobile (joystick analógico flutuante, arrasto orbital de câmera e botão dedicado de pulo em `src/joystick.js`) e a entidade do Hollow Elite (escala 2.2m, 200 HP, aura carmesim e drop de 6 Reishi) foram implementados e validados via Playwright Mobile em `scratch/test_mobile_and_elite.py`, zerando as pendências de escopo da Frente 1 e consolidando a Versão 1 com máximo de polimento e recursos.

## Fora deste status

Direção de câmera, sprite e FX: [direcionamento/](direcionamento/01-engenharia-reversa-pokebonk.md). Dívidas: [pendencias.md](pendencias.md). Pegadinhas: [aprendizados.md](aprendizados.md).
