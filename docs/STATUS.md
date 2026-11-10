# Status

Fotografia do protótipo. Plano em [ROADMAP.md](ROADMAP.md). O que já entrou no registro, em [_arquivo/changelog-entregas.md](_arquivo/changelog-entregas.md).

**Última atualização:** 2026-11-10

<!-- docs:progress:start -->
Gerado por `make docs-sync` a partir das caixas de `docs/ROADMAP.md`. Não edite este bloco à mão.

| Frente | Abertos | Entregues |
|---|---:|---:|
| Frente 0 — já está no código | 0 | 6 |
| Frente 1 — aceite da versão 1 | 0 | 6 |
| Frente 2 — versão 2 | 5 | 6 |
| Frente 3 — engenharia do protótipo | 2 | 1 |
| Radar | 0 | 0 |
| **Total** | **7** | **19** |
<!-- docs:progress:end -->

## Agora

O checkout é o protótipo **Bleach: Soul Survivor** (Three.js, Vite, arena, billboards). O workflow de CI (`.github/workflows/ci.yml`) foi alinhado à realidade do protótipo, executando auditoria de segredos (gitleaks), testes de governança e qualidade (`make size-check`, `make movement-test`, `make docs-test`, `make docs-check`) e build de produção com Vite, com a Pendência 1 formalmente sanada.

No código de `src/main.js` e `src/maps/hueco_mundo.js` o cenário oficial de combate da V1 é o **Hueco Mundo** (relevo 3D de dunas procedurais com heightmap, lua crescente, atmosfera noturna e 99 props canônicos de quartzo e ruínas de Las Noches com colisão física), precedido pelo **Prólogo no Dangai (DG)** (`src/prologue.js`, `src/maps/dangai.js`, `arts/56_dg_ground.png`, `arts/57_dg_props.png`) com mecânica de **corrida infinita em esteira (treadmill runner)**: Rukia Kuchiki (`src/assets/characters/rukia/`, gerada a partir de `arts/walk8/rukia_sheet.png`) e o Shinigami do jogador correm lado a lado em linha reta contínua ($X = \pm 0.85, Z = 0$) com passadas sincronizadas a 10 FPS, bobbing vertical de corrida e rolagem contínua de textura de solo e props. Os controles do jogador são completamente travados durante o diálogo da missão e o enquadramento de câmera persegue a dupla pelas costas. Ao confirmar os 4 diálogos ou pular o briefing, a transição pelo Senkaimon conduz ao combate no Hueco Mundo com destravamento imediato dos controles. O jogador e os hollows acompanham dinamicamente o desnível do terreno e o pulo vertical com gravidade. O estúdio 360° em `preview_map.html` inspeciona malhas, wireframes e colisores. Câmera orbital, horda unificada de Hollows Fishbone D e Chefão Menos Grande Gillian em `walk8` (8 frames e 4 direções), reishi, level-up com banner em tempo real e cartas substituíveis, armas com Getsuga Tenshō teleguiado devastador, boss Menos Grande individual aos 120 s ou 60 abates, tela de vitória com estatísticas e reinício em memória sem reload. O elenco jogável é Ichigo (shikai), Ishida, Sado e Grimmjow, com escolha por retrato no menu. Cada um tem kit de 22 clipes em `src/assets/characters/<id>/anims/` e arsenal próprio em `src/arsenal.js`, nas mesmas quatro posições de arma, com efeitos `skill_quincy_arrow`, `skill_cero`, `skill_directo` e `skill_muerte` ([direcionamento/17](direcionamento/17-kit-animacoes-personagem.md)). No `npm run dev`, a música começa sempre mutada (botão no canto inferior esquerdo, tecla M). FX configurável está em `src/fx/`. Tela de login PokéBonk ativa em `src/menu.js` acompanhada pelo **Hall da Fama / Ranking Global** (`src/leaderboard.js`, `server/telemetry_orchestrator.js`) com abates, tempo e dano persistidos.

A partida completa de ponta a ponta foi executada, validada e documentada com evidências de 9 telas em `_arquivo/changelog-entregas.md`. Os controles virtuais touch para mobile (joystick analógico flutuante, arrasto orbital de câmera e botão dedicado de pulo em `src/joystick.js`) e a entidade do Hollow Elite (escala 2.2m, 200 HP, aura carmesim e drop de 6 Reishi) foram implementados e validados via Playwright Mobile em `scratch/test_mobile_and_elite.py`, zerando as pendências de escopo da Frente 1 e consolidando a Versão 1 com máximo de polimento e recursos.

## Fora deste status

Direção de câmera, sprite e FX: [direcionamento/](direcionamento/01-engenharia-reversa-pokebonk.md). Dívidas: [pendencias.md](pendencias.md). Pegadinhas: [aprendizados.md](aprendizados.md).
