# Roadmap em dupla: filas do Waldir e do Rafael

Este documento reparte o [roadmap](roadmap.md) em dois núcleos de backlog para duas pessoas trabalharem em paralelo sem pisar no mesmo código. O `roadmap.md` continua sendo a fonte única de status e dependência; aqui fica **quem puxa o quê**, com o detalhe de dependências e specs de cada fila, e para onde vai backlog novo.

Atualizado em 31/10/2026.

## As duas filas

- **Fila Waldir — motor, servidor e operação.** Tudo que é lógica autoritativa, rede, banco, segurança, desempenho, CI e deploy: `server/`, `shared/src/formulas.ts`, `shared/src/map.ts`, `shared/src/progress.ts`, `Dockerfile`, `deploy/`, `.github/`, `server/scripts/`.
- **Fila Rafael — conteúdo, social e experiência.** Tudo que o jogador vê, lê e conversa: `client/` (Phaser, HUD, chat, diálogos), `shared/src/data.ts`, `shared/src/items.ts`, `shared/src/quests.ts`, `shared/src/shop.ts`, `shared/src/evolution.ts`, `shared/src/social.ts`, mapas `.tmj` e documentos de spec em `docs/features/`.

### Regras de convivência

1. **Item inteiro para uma pessoa.** Quando uma funcionalidade cruza cliente e servidor (ex.: troca 1v1), o dono do item implementa os dois lados na mesma branch. A fila define dono de item, não dono de diretório — com as exceções explícitas marcadas nas tabelas (M2-06, M2-07).
2. **Zonas de atrito.** `shared/src/data.ts`, `shared/src/items.ts` e `server/src/WorldRoom.ts` recebem código dos dois. Quem não é dono do arquivo principal toca nele só para o próprio item, em seção nova (`registerXMessages`, catálogo novo no fim do arquivo), e avisa antes de abrir a branch.
3. **Novos backlogs caem numa fila pela natureza do item:** envolve estado autoritativo, combate, economia no servidor, conta ou infraestrutura → Waldir; envolve mapa, NPC, missão, texto, sprite, HUD, chat ou spec → Rafael. Item duvidoso vai para conversa, nunca para as duas filas.
4. **Ordem e portões valem do `roadmap.md`.** Nenhuma fila fura portão: G1 (testar com amigos) exige F-13; G2 (abrir ao público) exige o resto dos F, M3-05 e M5-01.
5. **Specs.** Item com `Spec` marcada só começa com PRD e ADR em `docs/features/<nome>/`. Escrever spec é tarefa de Rafael na fila dele; aprovar spec é decisão das duas pessoas. A ordem de escrita está em [Plano de specs](#plano-de-specs).
6. **Balanceamento de números de jogo** (status, drops, XP, custos) é sempre revisado por Waldir, mesmo em item de Rafael — é a contraparte de conteúdo novo.

## Fila Waldir (W): fundação, motor e mundo

Itens herdados do roadmap (IDs originais, status lá). Coluna "Spec" = exige PRD/ADR antes de começar.

| Ordem | ID | Entrega | Tam. | Depende de | Spec | Obs. |
| :-- | :-- | :--- | :-- | :--- | :-- | :--- |
| 1 | F-13 | Primeiro deploy com HTTPS atrás do Caddy e restauração de backup testada | M | — | não | Destrava o portão G1; decisão de servidor e domínio pendente |
| 2 | F-04 | Capturar só `UNIQUE` em `createAccount` e `createChar` | P | — | não | |
| 3 | F-14 | Limite de criação de contas por IP | P | F-03 (feito) | não | |
| 4 | F-05 | Contêiner roda como `node`, não root | P | — | não | Conferir permissão de `/data` |
| 5 | F-06 | CSP e cabeçalhos de segurança no Caddy | P | — | não | |
| 6 | F-08 | Métrica da duração do tick, aviso acima de 50 ms | P | — | não | Antes de qualquer trabalho de desempenho |
| 7 | F-09 | Ranking sem bloquear o tick | M | F-08 | não | |
| 8 | F-10 | Trocar `sleep` fixo por `vi.waitFor`/`once` e limpar ruído do Vitest | M | — | não | Contínuo, junto com cada teste |
| 9 | F-11 | CI: gitleaks, `ubuntu-24.04`, Node 22 e 24, actions v7 | M | — | não | |
| 10 | F-15 | Balanceamento dos mapas avançados (`balance.ts`) | M | — | não | |
| 11 | M1-01 | `shared/src/chronicles.ts` (`weekNumber`, `weekIndex`, `currentWeekKey`) + testes de borda | P | M1-00 | PRD/ADRs das Crônicas | |
| 12 | M1-05 | `newProgress()` e `Progress.chronicle`; virada de semana zera `questKills`/`completedAt` | P | M1-01 | idem | |
| 13 | M1-04 | Servidor: `interact`, `npc_dialog`, `npc_action` com nó no servidor e distância validada | M | M1-02 e M1-03 (Rafael) | idem | Handler novo: skill `seguranca-servidor` |
| 14 | M1-06 | Missão semanal e recompensa por personagem | M | M1-00, M1-04, M1-05 | idem | Fazer antes a conta de cristais (D-001) |
| 15 | M1-09 | Cenário `cronicas.ts` e testes de rotação, diálogo e entrega | M | M1-06 e M1-07 (Rafael) | não | |
| 16 | F-12 | Upgrade do Colyseus 0.15 para 0.18 | G | — | **sim** | Antes de M4, W-02 e W-03; PR próprio com a bateria completa |
| 17 | M2-* | Status e controle de grupo: motor de status por tick, freeze (M2-02), slow (M2-03), DoT (M2-04), stun (M2-05) | G | — | **sim** | M2-06 e M2-07 são de Rafael (ver fila dele); o motor (M2-01) vem primeiro |
| 18 | M3-01 | Troca direta 1v1, duas confirmações, mesmo mapa e alcance | M | — | **sim** | Handler sensível (itens/kan): skill `seguranca-servidor` |
| 19 | M3-05 | Moderação de chat (filtro de spam, silenciar, comandos de GM) | M | — | **sim** | Portão G2 |
| 20 | M5-01 | Recuperação de senha por e-mail com token assinado | M | — | **sim** | Portão G2 |
| 21 | M5-02 | Limite de tentativas persistente (SQLite) | M | — | **sim** | Pode vir junto de M5-01 |
| 22 | M4-* | Dungeons: salas instanciadas (M4-01), puzzles/ondas/chefes com fases (M4-02), defesa do Senkaimon (M4-03) | G | F-12 | **sim** | M4-02 reutiliza W-04 se já existir |
| 23 | M5-04 | Partição do mundo por mapa | G | F-08, F-09 | **sim** | Só quando `baseline.md` mostrar necessidade |

Backlog novo (IDs W-##):

| Ordem | ID | Entrega | Tam. | Depende de | Spec |
| :-- | :-- | :--- | :-- | :--- | :-- |
| 24 | W-04 | **Chefes com fases e mecânicas** — motor de fases de boss (Aizen, Yhwach) reutilizável por chefe mundial e por M4-02 | M | — | sim |
| 25 | W-06 | **Títulos e marcos de servidor** — títulos por feitos (primeiro Bankai do servidor, top da arena), persistidos e exibidos no nome | M | — | não |
| 26 | W-07 | **Correio interno (mailbox)** — entrega de recompensas, itens de mercado expirado e mensagens de sistema | M | — | sim |
| 27 | W-05 | **Caçada offline v2** — resumo detalhado ao voltar (drops, mortes, kan), simulação por lote em vez de tick a tick | M | — | sim |
| 28 | W-09 | **Métricas de operação** — endpoint `/metrics` (tick, salas, jogadores, saves) com alerta mínimo | M | F-08 | não |
| 29 | W-08 | **Auditoria de economia** — trilha imutável de movimentação de kan/cristais/itens para detectar dupe e dar suporte | M | — | sim |
| 30 | W-01 | **Arena de duelos 1v1 ranqueada** — fila por reiatsu, rating Elo, anti-cheat de velocidade no servidor | G | M2-01 recomendado (CC em PvP) | sim |
| 31 | W-10 | **Anti-abuso de automação** — heurística de bot (cadência perfeita, sessão infinita) com flag de revisão, sem ban automático | M | W-09 recomendado | sim |
| 32 | W-13 | **Patrulhas idle de Hollows** — jogador/party enviado em patrulha por X horas retorna com recompensa (simulação autoritativa, como a caçada offline) | M | — | sim |
| 33 | W-02 | **Mundo Interior da Zanpakutō** — instância solo que desbloqueia Shikai/Bankai por prova de combate, não só por nível | G | F-12 e M4-01 (salas instanciadas) | sim |
| 34 | W-12 | **Dangai infinito v2** — ondas sem fim com placar de andar máximo por jogador e por party | M | W-04 recomendado | sim |
| 35 | W-03 | **Guerra de Guildas por território** — Rukongai em distritos; controle semanal com bônus de XP/drop | G | F-12 e M4-01; M3-04 recomendado | sim |
| 36 | W-11 | **Temporadas ranqueadas** — reset de rating, recompensas de temporada e hall da fama | G | W-01 e W-07 | sim |

## Fila Rafael (R): conteúdo, social e experiência

Itens herdados do roadmap e das pendências:

| Ordem | ID | Entrega | Tam. | Depende de | Spec | Obs. |
| :-- | :-- | :--- | :-- | :--- | :-- | :--- |
| 1 | M1-00 | Aprovar PRD e 3 ADRs das Crônicas; fechar pontos abertos do PRD §8 | P | — | é a própria spec | Decisão das duas pessoas; Rafael dirige |
| 2 | M1-02 | `shared/src/npcs.ts`: tipos e catálogo de NPCs | P | M1-00 | idem | |
| 3 | M1-03 | NPCs no `soul.tmj`, leitura em `parseMap` e `mapcheck` | M | M1-02 | idem | `parseMap`/`mapcheck` é código de `shared/src/map.ts` (zona de atrito com Waldir) |
| 4 | M1-08 | Textos e conteúdo das 5 crônicas | M | M1-00 | idem | Pode ir em paralelo a tudo |
| 5 | M1-07 | Janela de diálogo no `#modal` (teclado, toque, `Esc`) | M | M1-04 (Waldir) | idem | |
| 6 | M2-06 | Efeitos visuais de status (cor no sprite, ícone, número de dano contínuo) | M | M2-01 (Waldir) | spec de M2 | Exceção à regra 1: fatia de cliente de um pacote do Waldir |
| 7 | M2-07 | Tempo de recarga numérico no HUD | P | — | spec de M2 | Independente do motor; pode sair antes |
| 8 | M3-02 | Abas de chat (Geral, Combate, Party, Guilda, Privado) | M | — | sim | |
| 9 | M3-03 | Filtro de loot do Auto Helper | M | — | sim | Preferências no cliente, validação no servidor |
| 10 | M3-04 | Banco de guilda com permissões por cargo | M | — | sim | |
| 11 | M5-03 | Testes E2E no navegador com Playwright | M | — | sim | Movido para cá: é teste do cliente |
| 12 | — | Visual de equipamentos além do haori e da máscara | M | — | sim | Pendências §2; ganha ID quando entrar |
| 13 | — | Interiores de edifícios (quartéis, loja do Kisuke) | G | M1-03 recomendado | sim | Pendências §5; ganha ID quando entrar |

Backlog novo (IDs R-##):

| Ordem | ID | Entrega | Tam. | Depende de | Spec |
| :-- | :-- | :--- | :-- | :--- | :-- |
| 14 | R-01 | **Novos personagens jogáveis** — Orihime (suporte/barreira), Yoruichi, Urahara, Ukitake, Shunsui, Mayuri; cada um com 5 estágios e 4 técnicas | M cada | — | skill `adicionar-conteudo`; balance por Waldir |
| 15 | R-08 | **Onboarding e tutorial** — primeiros 10 minutos guiados com missão introdutória do Kisuke | M | M1-07 (janela de diálogo) | sim |
| 16 | R-10 | **Minimapa e marcadores** — minimapa por zona com ícones de NPC, portal, PZ e alvo de missão | M | M1-03 | não |
| 17 | R-12 | **Eventos narrados** — invasões e chefes mundiais com textos de lore no chat e banner no HUD | P | — | não |
| 18 | R-09 | **Codex / enciclopédia de lore** — bestiário expandido com fichas de personagens, facções e eventos | M | — | sim |
| 19 | R-14 | **Acessibilidade e QoL do cliente** — escala de fonte, alto contraste, re-mapeamento de teclas, modo uma mão no toque | M | — | sim |
| 20 | R-07 | **Companion: Mod Soul** — Kon e afins acompanham o personagem, coletam loot cosmético, progressão própria | M | M1-04 | sim |
| 21 | R-13 | **Cosméticos sazonais** — uniforme Karakura, haori de divisões, máscaras Vizard na Loja de Cristais | M | — | não |
| 22 | R-04 | **Expansão Wandenreich** — Sternritter como chefes de elite rotativos, Volständig visual para Ishida | M | W-04 recomendado | sim |
| 23 | R-05 | **Kidō e Hadō** — árvore paralela de habilidades: bakudō (CC/utilidade) e hadō (dano) | G | M2-01 a M2-05 (Waldir) | sim |
| 24 | R-06 | **Reputação das 13 Divisões** — missões de esquadrão, posto até capitão honorário, manto cosmético | G | M1-04; M3-04 recomendado | sim |
| 25 | R-02 | **Arco Fullbringer** — mapa Xcution, monstros Fullbringers, itens, Ginjo/Tsukishima como chefe/NPC | G | M1-03 | sim |
| 26 | R-03 | **Mapa Hell (Jigoku)** — zona 100+ pós-Wandenreich com ogres e mecânica de "pecado" | G | W-04 recomendado | sim |
| 27 | R-15 | **Specs pendentes** — escrever PRD/ADR dos itens marcados `sim` conforme as filas andam | contínuo | — | é o próprio trabalho |

## Plano de specs

Ordem sugerida de escrita (todas de Rafael, aprovadas pelas duas pessoas). Cada spec vive em `docs/features/<nome>/` com PRD + ADRs, no modelo de `features/cronicas-semanais-lore/`.

| Ordem | Spec | Destrava |
| :-- | :--- | :--- |
| 1 | Colyseus 0.18 (critérios, plano de migração, rollback) | F-12 → M4, W-02, W-03 |
| 2 | Status e controle de grupo (M2) | M2-01 a M2-07, R-05 |
| 3 | Social: trade 1v1 (M3-01), moderação (M3-05), abas de chat (M3-02), filtro de loot (M3-03), banco de guilda (M3-04) | M3 inteiro; M3-05 é portão G2 |
| 4 | Contas: recuperação de senha (M5-01) e limite persistente (M5-02) | Portão G2 |
| 5 | Dungeons e salas instanciadas (M4) | M4-01 a M4-03, W-02, W-03 |
| 6 | Arena ranqueada e temporadas (W-01, W-11) | PvP |
| 7 | Conteúdo grande: Fullbringer (R-02), Hell (R-03), Kidō (R-05), Divisões (R-06) | Expansões |
| 8 | E2E Playwright (M5-03), partição por mapa (M5-04) | Qualidade e escala |

## Como as filas se cruzam

Dependências explícitas entre as duas pessoas (as demais já estão na coluna "Depende de"):

- **M1 em zigue-zague:** Rafael entrega M1-02/M1-03 → Waldir faz M1-04 → Rafael faz M1-07 → Waldir fecha com M1-06/M1-09. M1-08 (textos) corre solto com Rafael.
- **M2 dividido:** Waldir faz o motor (M2-01 a M2-05); Rafael faz a camada visual (M2-06, M2-07). O motor sai primeiro.
- **Conteúdo de Rafael que precisa de motor do Waldir:** R-05 precisa de M2-01..05; R-02/R-03/R-04 rendem mais com W-04 (chefes com fases); R-06 e R-07 precisam de M1-04.
- **Instanciação é o gargalo comum:** F-12 → M4-01 destrava W-02, W-03 e qualquer conteúdo instanciado futuro. Prioridade compartilhada.
- **Balanceamento:** todo personagem, monstro, item ou mapa novo de Rafael passa por revisão de números de Waldir antes do merge.
- **Item novo criado no meio do caminho** entra neste arquivo na fila correta e, se for grande, ganha ID e linha no `roadmap.md` no mesmo PR.
