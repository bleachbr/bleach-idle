# 19 — Áudio de combate: BGM baixo, SFX e catraca

Trilha (BGM) e efeitos (SFX) são camadas separadas. Volume padrão da BGM fica em `0.08` em `src/audio.js`. Mute (botão / tecla M) silencia as duas.

## SFX

- Config declarativa: `src/sfxConfig.js` (`SFX_PRESETS`, `SFX_BY_FX`, eventos globais).
- Síntese / playback: `src/sfx.js` (Web Audio procedural; preset pode ganhar `sample` depois).
- Gatilhos no loop: `src/combatAudio.js`, chamado por `src/main.js` (slash, disparo de skill, hit, morte, dano no jogador).

Disparo de skill toca **uma** vez por salva (`onSkillFire(shot.fx)`), não por projétil do leque.

## Obrigação ao adicionar poder ou personagem

1. FX visual no registry (`src/characters.js` / `src/fx/`).
2. Shot no `src/arsenal.js`.
3. Chave em `SFX_BY_FX` apontando para um preset em `SFX_PRESETS` (ou preset novo com `kind` / `sample`).

Sem o passo 3, `make sfx-test` falha. O alvo entra em `make test` junto com `arsenal-test`.
