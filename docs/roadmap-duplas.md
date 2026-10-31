# Roadmap em dupla: filas do Waldir e do Rafael

Este documento reparte o [roadmap](roadmap.md) em dois núcleos de backlog para duas pessoas trabalharem em paralelo sem pisar no mesmo código. O `roadmap.md` continua sendo a fonte única de status e dependência; aqui fica **quem puxa o quê** e para onde vai backlog novo.

Atualizado em 31/10/2026.

## As duas filas

- **Fila Waldir — motor, servidor e operação.** Tudo que é lógica autoritativa, rede, banco, segurança, desempenho, CI e deploy: `server/`, `shared/src/formulas.ts`, `shared/src/map.ts`, `shared/src/progress.ts`, `Dockerfile`, `deploy/`, `.github/`, `server/scripts/`.
- **Fila Rafael — conteúdo, social e experiência.** Tudo que o jogador vê, lê e conversa: `client/` (Phaser, HUD, chat, diálogos), `shared/src/data.ts`, `shared/src/items.ts`, `shared/src/quests.ts`, `shared/src/shop.ts`, `shared/src/evolution.ts`, `shared/src/social.ts`, mapas `.tmj` e documentos de spec em `docs/features/`.

### Regras de convivência

1. **Item inteiro para uma pessoa.** Quando uma funcionalidade cruza cliente e servidor (ex.: troca 1v1), o dono do item implementa os dois lados na mesma branch. A fila define dono de item, não dono de diretório.
2. **Zonas de atrito.** `shared/src/data.ts`, `shared/src/items.ts` e `server/src/WorldRoom.ts` recebem código dos dois. Quem não é dono do arquivo principal toca nele só para o próprio item, em seção nova (`registerXMessages`, catálogo novo no fim do arquivo), e avisa antes de abrir a branch.
3. **Novos backlogs caem numa fila pela natureza do item:** envolve estado autoritativo, combate, economia no servidor, conta ou infraestrutura → Waldir; envolve mapa, NPC, missão, texto, sprite, HUD, chat ou spec → Rafael. Item duvidoso vai para conversa, nunca para as duas filas.
4. **Ordem e portões valem do `roadmap.md`.** Nenhuma fila fura portão: G1 (testar com amigos) exige F-13; G2 (abrir ao público) exige o resto dos F, M3-05 e M5-01.
5. **Specs.** Item `Precisa de spec` só começa com PRD e ADR em `docs/features/<nome>/`. Escrever spec é tarefa de Rafael na fila dele; aprovar spec é decisão das duas pessoas.

## Fila Waldir (W): fundação, motor e mundo

Itens herdados do roadmap (IDs originais, status lá):

| Ordem | ID | Entrega | Tam. | Obs. |
| :-- | :-- | :--- | :-- | :--- |
| 1 | F-13 | Primeiro deploy com HTTPS atrás do Caddy e restauração de backup testada | M | Destrava o portão G1 |
| 2 | F-04 | Capturar só `UNIQUE` em `createAccount` e `createChar` | P | |
| 3 | F-14 | Limite de criação de contas por IP | P | Depende de F-03 (feito) |
| 4 | F-05 | Contêiner roda como `node` | P | Conferir permissão de `/data` |
| 5 | F-06 | CSP e cabeçalhos de segurança no Caddy | P | |
| 6 | F-08 | Métrica da duração do tick, aviso acima de 50 ms | P | Antes de mexer em desempenho |
| 7 | F-09 | Ranking sem bloquear o tick | M | Depende de F-08 |
| 8 | F-10 | Trocar `sleep` fixo por `vi.waitFor`/`once` e limpar ruído do Vitest | M | Contínuo, junto com cada teste |
| 9 | F-11 | CI: gitleaks, `ubuntu-24.04`, Node 22 e 24, actions v7 | M | |
| 10 | F-15 | Balanceamento dos mapas avançados (`balance.ts`) | M | |
| 11 | M1-01 | `shared/src/chronicles.ts` (`weekNumber`, `weekIndex`, `currentWeekKey`) + testes de borda | P | Depende de M1-00 |
| 12 | M1-05 | `newProgress()` e `Progress.chronicle`; virada de semana zera `questKills`/`completedAt` | P | Depende de M1-01 |
| 13 | M1-04 | Servidor: `interact`, `npc_dialog`, `npc_action` com nó no servidor e distância validada | M | Depende de M1-02/M1-03 (Rafael) |
| 14 | M1-06 | Missão semanal e recompensa por personagem; conta de cristais antes | M | Depende de M1-04 e M1-05 |
| 15 | M1-09 | Cenário `cronicas.ts` e testes de rotação, diálogo e entrega | M | Depende de M1-06 e M1-07 |
| 16 | F-12 | Upgrade do Colyseus 0.15 para 0.18 | G | Precisa de spec; antes de M4 |
| 17 | M2-* | Status e controle de grupo no combate (motor por tick, freeze, slow, DoT, stun) | G | Precisa de spec. M2-06 (visuais) e M2-07 (HUD) são parte de cliente do mesmo pacote: quem tocar o item no cliente avisa, pois é arquivo de Rafael |
| 18 | M3-01 | Troca direta 1v1, duas confirmações, mesmo mapa e alcance | M | Precisa de spec |
| 19 | M3-05 | Moderação de chat (filtro de spam, silenciar, comandos de GM) | M | Precisa de spec; portão G2 |
| 20 | M5-01 | Recuperação de senha por e-mail com token assinado | M | Precisa de spec; portão G2 |
| 21 | M5-02 | Limite de tentativas persistente (SQLite) | M | Precisa de spec |
| 22 | M5-04 | Partição do mundo por mapa | G | Precisa de spec; depois de F-08 e F-09 |
| 23 | M4-* | Dungeons cooperativas e raids (salas instanciadas, puzzles, chefes com fases, defesa do Senkaimon) | G | Precisa de spec; depois de F-12 |
| 24 | M5-03 | Testes E2E no navegador com Playwright | M | Precisa de spec |

Backlog novo (IDs W-##, detalhados quando virarem foco):

| ID | Entrega | Tam. |
| :-- | :--- | :-- |
| W-01 | **Arena de duelos 1v1 ranqueada** — fila por reiatsu, rating Elo por temporada, replay de placar no ranking. Servidor autoritativo com anti-cheat de velocidade | G |
| W-02 | **Mundo Interior da Zanpakutō** — instância solo por personagem (meditação) que desbloqueia Shikai/Bankai por prova de combate, não só por nível | G |
| W-03 | **Guerra de Guildas por território** — Rukongai dividido em distritos; guildas disputam controle semanal com bônus de XP/drop no mapa | G |
| W-04 | **Chefes com fases e mecânicas** — motor de fases de boss (Aizen, Yhwach) reutilizado por chefe mundial e por M4 | M |
| W-05 | **Caçada offline v2** — resumo detalhado ao voltar (drops, mortes, kan), simulação por lote em vez de tick a tick | M |
| W-06 | **Sistema de títulos e marcos de servidor** — títulos por feitos (primeiro Bankai do servidor, top da arena), persistidos e exibidos no nome | M |
| W-07 | **Correio interno (mailbox)** — entrega de recompensas, itens do mercado expirado e mensagens de sistema por caixa de entrada | M |
| W-08 | **Auditoria e trilha de economia** — log imutável de movimentação de kan/cristais/itens para detectar dupe e dar suporte | M |
| W-09 | **Métricas de operação** — endpoint `/metrics` (tick, salas, jogadores, saves) com alerta mínimo; depende de F-08 | M |
| W-10 | **Anti-abuso de automação** — detecção heurística de bot (cadência perfeita, sessão infinita) com flags de revisão, sem ban automático | M |
| W-11 | **Temporadas ranqueadas** — reset de rating, recompensas de temporada e hall da fama (usa W-01 e M5) | G |
| W-12 | **Hueco Mundo profundo / Dangai infinito v2** — ondas sem fim com placar de andar máximo por jogador e por party | M |

## Fila Rafael (R): conteúdo, social e experiência

Itens herdados do roadmap (IDs originais, status lá):

| Ordem | ID | Entrega | Tam. | Obs. |
| :-- | :-- | :--- | :-- | :--- |
| 1 | M1-00 | Aprovar PRD e 3 ADRs das Crônicas; fechar pontos abertos do PRD §8 | P | Decisão das duas pessoas; Rafael dirige |
| 2 | M1-02 | `shared/src/npcs.ts`: tipos e catálogo de NPCs | P | Depende de M1-00 |
| 3 | M1-03 | NPCs no `soul.tmj`, leitura em `parseMap` e `mapcheck` | M | Depende de M1-02 |
| 4 | M1-08 | Textos e conteúdo das 5 crônicas | M | Depende de M1-00 |
| 5 | M1-07 | Janela de diálogo no `#modal` (teclado, toque, `Esc`) | M | Depende de M1-04 (Waldir) |
| 6 | M3-02 | Abas de chat (Geral, Combate, Party, Guilda, Privado) | M | Precisa de spec |
| 7 | M3-03 | Filtro de loot do Auto Helper | M | Precisa de spec |
| 8 | M3-04 | Banco de guilda com permissões por cargo | M | Precisa de spec |
| 9 | — | Visual de equipamentos além do haori e da máscara | M | Pendências §2 |
| 10 | — | Interiores de edifícios (quartéis, loja do Kisuke) | G | Pendências §5; precisa de spec |

Backlog novo (IDs R-##, detalhados quando virarem foco):

| ID | Entrega | Tam. |
| :-- | :--- | :-- |
| R-01 | **Novos personagens jogáveis** — próximos: Orihime (suporte/barreira), Yoruichi, Urahara, Ukitake, Shunsui, Mayuri; cada um com 5 estágios e 4 técnicas | M cada |
| R-02 | **Arco Fullbringer** — mapa Xcution, monstros Fullbringers, itens e 1 personagem (Ginjo ou Tsukishima como chefe/NPC) | G |
| R-03 | **Mapa Hell (Jigoku)** — zona 100+ pós-Wandenreich com ogres e mecânica de "pecado" (debuff por morte em sequência) | G |
| R-04 | **Quincy: expansão Wandenreich** — Sternritter como chefes de elite rotativos, arco Quincy para Ishida (Volständig visual) | M |
| R-05 | **Kidō e Hadō** — árvore de habilidades paralela às técnicas: bakudō (utilidade/CC) e hadō (dano), treinada no Seireitei | G |
| R-06 | **Reputação das 13 Divisões** — missões de esquadrão, posto (4ª cadeira → tenente → capitão honorário) e manto de divisão cosmético | G |
| R-07 | **Companion: Mod Soul / mascote** — Kon e afins acompanham o personagem, coletam loot cosmético e dão bônus pequenos; progressão própria | M |
| R-08 | **Onboarding e tutorial** — primeiros 10 minutos guiados (mover, atacar, loot, Auto Helper) com missão introdutória do Kisuke | M |
| R-09 | **Codex / enciclopédia de lore** — bestiário expandido com fichas de personagens, facções e eventos desbloqueados por progresso | M |
| R-10 | **Minimapa e marcadores de missão** — minimapa por zona com ícones de NPC, portal, PZ e alvo de missão | M |
| R-11 | **Passa-tempo idle: missões de patrulha** — party enviada em patrulha de Hollows por X horas retorna com recompensa (estilo idle clássico) | M |
| R-12 | **Eventos narrados** — invasões e chefes mundiais com textos de lore no chat e banner no HUD, em vez de só log de sistema | P |
| R-13 | **Cosméticos sazonais** — pacotes visuais de temporada (uniforme escolar Karakura, haori de divisões, máscaras Vizard) na Loja de Cristais | M |
| R-14 | **Acessibilidade e QoL do cliente** — escala de fonte, alto contraste, re-mapeamento de teclas, modo uma mão no toque | M |
| R-15 | **Specs pendentes** — escrever PRD/ADR dos itens `Precisa de spec` conforme a fila anda (M2, M3, M4, M5, R-02, R-03, R-05, R-06) | contínuo |

## Como as filas se cruzam

Dependências explícitas entre as duas pessoas (as demais já estão na coluna "Depende de" do `roadmap.md`):

- Rafael entrega M1-02/M1-03 **antes** de Waldir fazer M1-04; Waldir entrega M1-04 antes de Rafael fazer M1-07.
- R-01 a R-04 (personagens e mapas) podem exigir sprites novos e slots de equipamento: o balanceamento (status, drops) é de Waldir na revisão do item.
- W-02, W-03 e R-05/R-06 dependem de salas instanciadas (M4-01) se forem além de um único mapa público — ordenar depois de F-12.
- Qualquer item novo criado no meio do caminho entra neste arquivo na fila correta e, se for grande, ganha ID e linha no `roadmap.md` no mesmo PR.
