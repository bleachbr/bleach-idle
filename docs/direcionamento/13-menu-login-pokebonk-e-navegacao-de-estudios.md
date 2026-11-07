# Direcionamento 13 — Menu de Início Estilo PokéBonk e Acesso aos Estúdios 360°

**Data:** 2026-11-07  
**Contexto:** Entrega 1 — Interface de Entrada, Identidade do Jogador e Acesso às Ferramentas de Criação

---

## 1. Visão Geral e Inspiração PokéBonk

No PokéBonk original, o jogador é recebido por uma tela de entrada dinâmica onde:
1. O cenário 3D gira lentamente em órbita cinemática ao fundo.
2. O logotipo e títulos flutuam com animações suaves de Reiatsu e respiração.
3. O jogador insere seu apelido (nickname) persistido no `localStorage`.
4. Um botão principal de ação (*CTA*) com pulsação energética convida à batalha.
5. Botões de acesso rápido às ferramentas de desenvolvimento e estúdios ficam imediatamente acessíveis.

No **Bleach: Soul Survivor**, implementamos essa mesma experiência com a identidade visual sombria do anime (Reiatsu azul e dourada, tipografia estilizada e cartões translúcidos em glassmorphism).

---

## 2. Componentes e Estrutura Visual

### 2.1 Card Central de Login (`#login-menu`)
- **Logo e Subtítulo:** "BLEACH: SOUL SURVIVOR" com brilho dinâmico (`reiatsuPulse`) e flutuação vertical (`floatLogo`).
- **Chip do Personagem:** Apresenta o combatente ativo (ex: `Ichigo Kurosaki (Shikai) - Zangetsu`) com indicador de prontidão.
- **Campo de Nickname:** `input#player-nickname` pré-carrega o apelido salvo no navegador via `localStorage` (padrão: "Ichigo Kurosaki") com suporte a tecla `Enter`.
- **Botão Principal CTA (`#btn-play-game`):** Botão gradiente de alta energia com animações de pulso (`pokebonkPulse`) e varredura de luz (`flareSweep`).

### 2.2 Botões Dedicados aos Estúdios 360°
Posicionados exclusivamente na barra de utilitários do menu de login (ocultados durante o combate para manter a HUD limpa e imersiva):
- **360° Map Studio (`#btn-map-studio`):** Redireciona para `/preview_map.html`, permitindo inspecionar o relevo 3D de dunas do Hueco Mundo, texturas de solo, lua mística e 99 props canônicos de quartzo.
- **360° Sprite Studio (`#btn-sprite-studio`):** Redireciona para `/preview.html`, permitindo girar 360° os spritesheets de 8 quadros do Ichigo e Hollows em tempo real com validação visual de alinhamento.

---

## 3. Arquitetura Modular (`src/menu.js`)

Para respeitar os limites de tamanho de arquivo e funções da governança (`make size-check` com teto de 20 linhas por função), toda a lógica do menu foi isolada em `src/menu.js`:

```
src/
├── menu.js                # Lógica pura de menu, persistência e câmera orbital cinemática
├── movement.js            # Lógica pura de movimentação relativa e ciclo de pernas
├── maps/hueco_mundo.js    # Geração procedural do mapa e relevo
└── main.js                # Orquestração de alto nível e ciclo de vida da partida
```

### Funções Principais de `src/menu.js`:
- `getSavedPlayerName()`: Recupera o apelido salvo ou retorna o valor padrão seguro.
- `savePlayerName(name)`: Sanitiza, limita a 16 caracteres e persiste no `localStorage`.
- `updateMenuCamera(cameraState, dt)`: Atualiza a rotação contínua da câmera orbital (`yaw += dt * 0.12`, `pitch = 0.42`, `dist = 14.5`).
- `showLoginMenu()` / `hideLoginMenu()`: Gerencia alternância de classes CSS `.hidden` entre o menu e o HUD do jogo.
- `initLoginMenu(callbacks)`: Liga os eventos de clique e teclado aos handlers de início, retorno e reinício.

---

## 4. Ciclo de Vida da Partida e Retorno ao Menu

O jogo agora possui três estados de transição claros e não destrutivos:
1. **Entrar na Partida (`startGame(name)`):** Salva o nickname, oculta o menu, ativa o loop de gameplay, reseta o estado da partida e captura o mouse via Pointer Lock.
2. **Voltar ao Menu (`returnToMenu()`):** Libera o Pointer Lock, pausa a partida, oculta os modais de pausa/game over e reabre o menu inicial mantendo o apelido digitado.
3. **Reiniciar Partida (`restartGame()`):** Executa reset completo de contadores, posição, armas e inimigos sem precisar recarregar a página inteira via `location.reload()`.

Modais atualizados com botão **VOLTAR AO MENU**:
- `#pause-modal`: Botão `#btn-menu-pause` permite sair da partida pausada de volta à tela de login.
- `#gameover-modal`: Botão `#btn-menu-gameover` permite sair do resumo pós-batalha de volta à tela de login.

---

## 5. Garantias e Testes Automatizados

1. **Testes Unitários:** `make movement-test` garante que o ciclo de pernas e o cálculo angular da câmera permaneçam intactos.
2. **Catracas de Tamanho:** `make size-check` valida que nenhuma função ultrapassa 20 linhas de código e que a dívida técnica de `src/main.js` permaneceu controlada.
3. **Validação E2E com Playwright:** Testes automatizados verificam rotação do cenário no menu, persistência do nickname no localStorage, início de partida, movimentação e retorno ao menu.
