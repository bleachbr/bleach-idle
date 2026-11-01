# Roadmap em dupla: filas do Waldir e do Rafael

Este documento reparte o [roadmap](roadmap.md) em dois núcleos de backlog para duas pessoas trabalharem em paralelo sem pisar no mesmo código. O `roadmap.md` continua sendo a fonte única de status e dependência; aqui fica **quem puxa o quê**, com o detalhe de dependências e specs de cada fila.

Atualizado em 31/10/2026.

## As duas filas

As filas são **estanques**: ninguém puxa item da fila do outro. Mas os **temas são mistos em cada uma** — os dois tocam `server/`, `client/`, `shared/` e mapas. O critério de repartição não é camada, é pacote de funcionalidade:

- **Item inteiro para uma pessoa.** Cada entrega cruza as camadas que precisar (handler no `WorldRoom`, fórmula em `shared`, HUD no `client`, mapa `.tmj`) na mesma branch, do começo ao fim. Exceções explícitas estão marcadas nas tabelas.
- **Waldir** carrega a fundação (segurança, infra, deploy, Colyseus), o motor de combate e os pacotes de mundo/instâncias — mais pacotes de conteúdo próprios (personagens, arco Fullbringer, reputação das divisões).
- **Rafael** carrega a vertical do M1 no cliente e nos dados, a camada visual de M2, o social completo (trade, chat, guilda), contas no navegador (E2E) e os pacotes de conteúdo narrativo e de QoL.

### Regras de convivência

1. **Zonas de atrito.** `shared/src/data.ts`, `shared/src/items.ts` e `server/src/WorldRoom.ts` recebem código dos dois. Regra: código novo entra em seção nova (`registerXMessages` próprio, catálogo novo no fim do arquivo) e quem abre branch em cima desses arquivos avisa a outra pessoa.
2. **Item preso à fila.** Acabou a sua fila ou está tudo bloqueado? Ajuda-se por **revisão**, não puxando item alheio — a revisão adversarial de um item é sempre feita por quem não o escreveu (regra 6).
3. **Novos backlogs entram numa das duas filas** na linha correspondente, escolhida por conversa; item grande ganha ID e linha no `roadmap.md` no mesmo PR.
4. **Ordem e portões valem do `roadmap.md`.** Nenhuma fila fura portão: G1 (testar com amigos) exige F-13; G2 (abrir ao público) exige o resto dos F, M3-05 e M5-01.
5. **Specs.** Item com `Spec` marcada só começa com PRD e ADR em `docs/features/<nome>/`. Quem escreve a spec é o dono do item; quem aprova são as duas pessoas. A ordem de escrita está em [Plano de specs](#plano-de-specs).
6. **Balanceamento de números de jogo** (status, drops, XP, custos) e **handlers sensíveis** (itens, kan, conta) têm sempre revisão adversarial da outra pessoa — skill `seguranca-servidor` como checklist.

## Fila Waldir (W): fundação, motor e pacotes de mundo

Itens herdados do roadmap (IDs originais, status lá). Coluna "Spec" = exige PRD/ADR antes de começar.

| Ordem | ID | Entrega | Tam. | Depende de | Spec | Obs. |
| :-- | :-- | :--- | :-- | :--- | :-- | :--- |
| 0 | F-16 | **Pacote de correções do Jogador-IA** (`boneco` sem HD, `nextTarget` ignorando `dummy`, exclusividade de janelas + `Esc`, confirmação no `#exit-btn`, `welcome`/`fx` e tooltips de botões desabilitados) | M | — | não | **Feito** — validado com testes determinísticos + simulação real do Jogador-IA (`test/`) |
| 1 | F-13 | Primeiro deploy com HTTPS atrás do Caddy e restauração de backup testada | M | — | não | Destrava o portão G1; decisão de servidor e domínio pendente |
| 2 | F-04 | Capturar só `UNIQUE` em `createAccount` e `createChar` | P | — | não | **Feito** (`fix/f-04-unique-db`) |
| 3 | F-14 | Limite de criação de contas por IP | P | F-03 (feito) | não | **Feito** (`feat/f-14-limite-contas-ip`) |
| 4 | F-05 | Contêiner roda como `node`, não root | P | — | não | **Feito** (`fix/f-05-docker-user-node`) |
| 5 | F-06 | CSP e cabeçalhos de segurança no Caddy | P | — | não | **Feito** (`feat/f-06-caddy-csp-headers`) |
| 6 | F-08 | Métrica da duração do tick, aviso acima de 50 ms | P | — | não | **Feito** (`feat/f-08-metrica-tick`) |
| 7 | F-09 | Ranking sem bloquear o tick | M | F-08 | não | **Feito** (`perf/f-09-ranking-incremental`) |
| 8 | F-11 | CI: gitleaks, `ubuntu-24.04`, Node 22 e 24, actions v7 | M | — | não | **Feito** (`ci/f-11-ci-gitleaks-matrix`) |
| 9 | F-15 | Balanceamento dos mapas avançados (`balance.ts`) | M | — | não | **Feito** (`feat/f-15-balanceamento-mapas`) |
| 10 | M1-01 | `shared/src/chronicles.ts` (`weekNumber`, `weekIndex`, `currentWeekKey`) + testes de borda | P | M1-00 (Rafael) | PRD/ADRs das Crônicas | **Feito** (`feat/m1-01-05-chronicles-core`) |
| 11 | M1-05 | `newProgress()` e `Progress.chronicle`; virada de semana zera `questKills`/`completedAt` | P | M1-01 | idem | **Feito** (`feat/m1-01-05-chronicles-core`) |
| 12 | M1-04 | Servidor: `interact`, `npc_dialog`, `npc_action` com nó no servidor e distância validada | M | M1-02 e M1-03 (Rafael) | idem | Handler novo: skill `seguranca-servidor` |
| 13 | M1-08 | Textos e conteúdo das 5 crônicas | M | M1-00 | idem | **Feito** (`feat/m1-08-cronicas-conteudo`) |
| 14 | M1-06 | Missão semanal e recompensa por personagem | M | M1-00, M1-04, M1-05 | idem | Fazer antes a conta de cristais (D-001) |
| 15 | M1-09 | Cenário `cronicas.ts` e testes de rotação, diálogo e entrega | M | M1-06 e M1-07 (Rafael) | não | |
| 16 | M2-01..05 | Motor de status por tick + freeze, slow, DoT, stun | G | — | **Feito** (`feat/m2-01-05-motor-status`) | Spec em `docs/features/status-combate/`; M2-06 e M2-07 (visual/HUD) são de Rafael |
| 17 | M3-05 | Moderação de chat (filtro de spam, silenciar, comandos de GM) | M | — | **Feito** (`feat/m3-05-moderacao-chat`) | Portão G2; spec em `docs/features/moderacao-chat/` |
| 18 | M5-01 | Recuperação de senha por e-mail com token assinado | M | — | **Feito** (`feat/m5-01-02-recuperacao-rate-limit`) | Portão G2; spec em `docs/features/seguranca-contas/` |
| 19 | M5-02 | Limite de tentativas persistente (SQLite) | M | — | **Feito** (`feat/m5-01-02-recuperacao-rate-limit`) | Persistido em `auth_limits` no SQLite |
| 20 | F-12 | Upgrade do Colyseus 0.15 para 0.18 | G | — | **sim** | Antes de M4, W-16 e W-17; PR próprio com a bateria completa |
| 21 | M4-* | Dungeons: salas instanciadas (M4-01), puzzles/ondas/chefes com fases (M4-02), defesa do Senkaimon (M4-03) | G | F-12 | **sim** | M4-02 reutiliza W-04 se já existir |
| 22 | M5-04 | Partição do mundo por mapa | G | F-08, F-09 | **sim** | Só quando `baseline.md` mostrar necessidade |

Backlog novo (IDs W-##) — motor, operação e conteúdo de mundo misturados:

| Ordem | ID | Entrega | Tam. | Depende de | Spec |
| :-- | :-- | :--- | :-- | :--- | :-- |
| 23 | W-04 | **Chefes com fases** — motor de fases de boss (Aizen, Yhwach) reutilizável por chefe mundial e M4-02 | M | — | **Feito** (`feat/w-04-chefes-fases`) |
| 24 | W-06 | **Títulos e marcos de servidor** — por feitos (primeiro Bankai do servidor, top da arena), persistidos | M | — | **Feito** (`feat/w-06-marcos-servidor`) |
| 25 | W-07 | **Correio interno (mailbox)** — recompensas, itens de mercado expirado, mensagens de sistema | M | — | sim |
| 26 | W-05 | **Caçada offline v2** — resumo detalhado ao voltar (drops, mortes, kan), simulação por lote | M | — | sim |
| 27 | W-09 | **Métricas de operação** — `/metrics` (tick, salas, jogadores, saves) com alerta mínimo (`feat/w-09-metricas-operacao` — **Feito**) | M | F-08 | não |
| 28 | W-08 | **Auditoria de economia** — trilha imutável de kan/cristais/itens (anti-dupe, suporte) | M | — | sim |
| 29 | W-13 | **Patrulhas idle de Hollows** — jogador/party em patrulha por X horas retorna com recompensa | M | — | sim |
| 30 | W-14 | **Personagens novos (bloco W)** — Orihime (barreira/suporte), Urahara, Mayuri; 5 estágios e 4 técnicas cada | M cada | — | skill `adicionar-conteudo`; Orihime exige mecânica nova de barreira no motor |
| 31 | W-01 | **Arena de duelos 1v1 ranqueada** — fila por reiatsu, rating Elo, anti-cheat de velocidade | G | M2-01 recomendado | sim |
| 32 | W-10 | **Anti-abuso de automação** — heurística de bot com flag de revisão, sem ban automático | M | W-09 recomendado | sim |
| 33 | W-15 | **Arco Fullbringer (pacote completo)** — mapa Xcution, monstros, itens, Ginjo/Tsukishima como chefe/NPC | G | W-04 recomendado | sim |
| 34 | W-16 | **Mundo Interior da Zanpakutō** — instância solo que desbloqueia Shikai/Bankai por prova de combate | G | F-12 e M4-01 | sim |
| 35 | W-17 | **Guerra de Guildas por território** — Rukongai em distritos, controle semanal com bônus | G | F-12 e M4-01; M3-04 recomendado | sim |
| 36 | W-12 | **Dangai infinito v2** — ondas sem fim, placar de andar máximo por jogador e party | M | W-04 recomendado | sim |
| 37 | W-18 | **Reputação das 13 Divisões** — missões de esquadrão, posto até capitão honorário, manto cosmético | G | M1-04; M3-04 recomendado | sim |
| 38 | W-11 | **Temporadas ranqueadas** — reset de rating, recompensas e hall da fama | G | W-01 e W-07 | sim |

## Fila Rafael (R): experiência, social e pacotes narrativos

Itens herdados do roadmap e das pendências:

| Ordem | ID | Entrega | Tam. | Depende de | Spec | Obs. |
| :-- | :-- | :--- | :-- | :--- | :-- | :--- |
| 1 | M1-00 | Aprovar PRD e 3 ADRs das Crônicas; fechar pontos abertos do PRD §8 | P | — | é a própria spec | Decisão das duas pessoas; Rafael dirige |
| 2 | M1-02 | `shared/src/npcs.ts`: tipos e catálogo de NPCs | P | M1-00 | idem | |
| 3 | M1-03 | NPCs no `soul.tmj`, leitura em `parseMap` e `mapcheck` | M | M1-02 | idem | `parseMap`/`mapcheck` mexe em `shared/src/map.ts` (zona de atrito) |
| 4 | M1-07 | Janela de diálogo no `#modal` (teclado, toque, `Esc`) | M | M1-04 (Waldir) | idem | |
| 5 | M2-07 | Tempo de recarga numérico no HUD | P | — | spec de M2 | Independente do motor; pode sair antes |
| 6 | M2-06 | Efeitos visuais de status (cor no sprite, ícone, número de dano contínuo) | M | M2-01 (Waldir) | spec de M2 | Fatia de cliente do pacote M2 |
| 7 | F-10 | Trocar `sleep` fixo por `vi.waitFor`/`once` e limpar ruído do Vitest | M | — | não | Contínuo, junto com cada teste que tocar |
| 8 | M3-02 | Abas de chat (Geral, Combate, Party, Guilda, Privado) | M | — | sim | |
| 9 | M3-01 | Troca direta 1v1, duas confirmações, mesmo mapa e alcance | M | — | sim | Servidor + UI; handler sensível: skill `seguranca-servidor`, revisão do Waldir |
| 10 | M3-03 | Filtro de loot do Auto Helper | M | — | sim | Preferências no cliente, validação no servidor |
| 11 | M3-04 | Banco de guilda com permissões por cargo | M | — | sim | Handler sensível (itens/kan): revisão do Waldir |
| 12 | M5-03 | Testes E2E no navegador com Playwright | M | — | sim | Login, menus, HUD |
| 13 | — | Visual de equipamentos além do haori e da máscara | M | — | sim | Pendências §2; ganha ID quando entrar |
| 14 | — | Interiores de edifícios (quartéis, loja do Kisuke) | G | M1-03 recomendado | sim | Pendências §5; ganha ID quando entrar |

Backlog novo (IDs R-##) — narrativa, QoL e social com partes de servidor:

| Ordem | ID | Entrega | Tam. | Depende de | Spec |
| :-- | :-- | :--- | :-- | :--- | :-- |
| 15 | R-01 | **Personagens novos (bloco R)** — Yoruichi, Ukitake, Shunsui; 5 estágios e 4 técnicas cada | M cada | — | skill `adicionar-conteudo` |
| 16 | R-08 | **Onboarding e tutorial** — primeiros 10 minutos guiados com missão introdutória do Kisuke | M | M1-07 | sim |
| 17 | R-10 | **Minimapa e marcadores** — minimapa por zona com ícones de NPC, portal, PZ e alvo de missão | M | M1-03 | não |
| 18 | R-12 | **Eventos narrados** — invasões e chefes mundiais com textos de lore no chat e banner no HUD | P | — | não |
| 19 | R-09 | **Codex / enciclopédia de lore** — bestiário expandido com fichas de personagens, facções e eventos | M | — | sim |
| 20 | R-14 | **Acessibilidade e QoL do cliente** — escala de fonte, alto contraste, re-mapeamento de teclas, modo uma mão no toque | M | — | sim |
| 21 | R-07 | **Companion: Mod Soul** — Kon e afins acompanham o personagem, coletam loot cosmético, progressão própria (entidade seguidora no servidor + visual no cliente) | M | M1-04 | sim |
| 22 | R-13 | **Cosméticos sazonais** — uniforme Karakura, haori de divisões, máscaras Vizard na Loja de Cristais | M | — | não |
| 23 | R-04 | **Expansão Wandenreich** — Sternritter como chefes de elite rotativos, Volständig visual para Ishida | M | W-04 recomendado | sim |
| 24 | R-05 | **Kidō e Hadō** — árvore paralela de habilidades: bakudō (CC/utilidade) e hadō (dano); servidor e HUD | G | M2-01 a M2-05 (Waldir) | sim |
| 25 | R-03 | **Mapa Hell (Jigoku)** — zona 100+ com ogres, mecânica de "pecado" (debuff por morte), drops novos | G | W-04 recomendado | sim |
| 26 | R-15 | **Specs pendentes da fila R** — PRD/ADR dos itens R marcados `sim` conforme a fila anda | contínuo | — | é o próprio trabalho |

## Horizonte de expansão (pós-G2)

Backlog profundo, pesquisado contra o universo de Bleach (arcos ainda não cobertos: Bount, Zanpakutō Rebeldes, Reigai, filmes) e contra mecânicas consolidadas de idle/MMO (prestígio em camadas, geradores aninhados, marcos, eventos raros, profissões, coleções). Tudo aqui é `Precisa de spec` até ser promovido para uma fila com ordem. A tag `[W]`/`[R]` indica a fila de destino quando o item entrar.

### Sagas e conteúdo de Bleach ainda não usados

| Tag | Item | Ideia |
| :-- | :--- | :--- |
| [W] | **Arco Bount** | Jin Kariya e os Bount como invasão sazonal: monstros "doll" com vínculo mestre-doll (dois alvos ligados, matar o mestre enfraquece a doll — reusa o motor de vínculo de M2) |
| [W] | **Zanpakutō Rebeldes** | Evento onde a Zanpakutō do jogador vira NPC inimigo temporário: luta solo contra o próprio kit de técnicas; recompensa desbloqueia "voz da Zanpakutō" (buff cosmético) |
| [R] | **Reigai (Invasão do Gotei 13)** | Clones corruptos dos capitães como chefes de elite espelhados — reusa sprites dos personagens com paleta roxa; bom retorno de arte por esforço |
| [W] | **Palácio Real e Divisão Zero** | Mapa de elite pós-100: Senjumaru, Ōetsu (forja especial), Ichibē; requer M4-01 (instância) e W-16 (prova de Bankai) como narrativa de acesso |
| [W] | **Memories of Nobody — Vale dos Gritos** | Dungeon instanciada com os Blanks (almas sem memória) e chefe Ganryu; mecânica de "memória roubada" (debuff que esconde técnicas) |
| [R] | **Diamond Dust Rebellion** | Evento de Hitsugaya: artefato Ōin roubado, escolta de caravana pelo Seireitei com ondas de ambush — primeiro evento de escolta do jogo |
| [R] | **Fade to Black** | Evento de lore: "a apagadora" remove temporariamente buffs de conjuntos/conquistas numa zona; retorno narrativo barato com sistemas existentes |
| [W] | **Soukyoku Hill** | Arena de evento PvE no cadafalso: defesa da Rukia contra ondas — primo da defesa do Senkaimon (M4-03), reusa motor |
| [R] | **Karakura noturna** | Ciclo dia/noite nos mapas com spawns diferentes (Hollows mais fortes à noite, Plus durante o dia) e filtros de cor no cliente |
| [R] | **Konso e Pluses** | Mini-loop idle novo: purificar Pluses espalhados por Karakura/Rukongai dá "mérito espiritual" (moeda de facção Soul Society) |

### Mecânicas de idle para aprofundar o gênero

| Tag | Item | Ideia |
| :-- | :--- | :--- |
| [W] | **Segunda camada de prestígio: Transcendência** | Acima do renascimento: reseta o bônus de renascimento e paga "Reiatsu Ancestral", moeda própria com loja exclusiva (modelo Ascension→Transcendence do Clicker Heroes) |
| [W] | **Academia Shin'ō** | Gerador aninhado: recrutas de academy produzem "formados" que alimentam missões de patrulha (W-13) — gerador que produz gerador, regra do gênero |
| [W] | **Marcos automáticos (x2/x3/x5)** | Saltos de produção/XP em limites de posse (25/50/100 monstros no bestiário, itens forjados) — milestone idiomático do idle |
| [W] | **Menos Grande dourado** | Evento raro (estilo golden cookie): Menos dourado aparece por 60 s em mapa aleatório, recompensa multiplicada; anunciado no chat global |
| [W] | **Salto de tempo** | Consumível raro que adianta X horas de caçada offline — decide economia com a conta de cristais (D-001) |
| [W] | **Sinergias cruzadas** | Bônus por diversidade: cada conjunto completo diferente dá +1% global — combate a armadilha "compre sempre o mesmo item" |
| [W] | **Afinidade de caçada** | Monstro tem elemento (fogo/gelo/trovão/corte); técnica com afinidade certa dá +25% — decisão de build para a sessão, não reflexo |
| [R] | **Relíquias** | Itens de prestígio permanentes comprados com Reiatsu Ancestral: cada renascimento/transcendência melhora o drop delas |

### Sistemas clássicos de MMO

| Tag | Item | Ideia |
| :-- | :--- | :--- |
| [W] | **Profissões: forja e coleta** | Minério espiritual e ervas do Rukongai coletados por ação idle; a forja do Kisuke sobe de nível e desbloqueia +11 a +15 |
| [W] | **Cadeia de crafting** | Consumível de recurso: refino de minério → lingote → peça — a primeira supply chain do jogo, testada com a taxa de drop |
| [W] | **Leilão global** | Evolução do mercado: leilão com lances em vez de anúncio fixo; W-07 (mailbox) entrega lances perdidos |
| [R] | **Moradia: quarto no esquadrão** | Mapa interior instanciado por jogador com troféus (bestiário, títulos, manto de divisão) — reusa M4-01 |
| [R] | **Montarias espirituais** | Desbloqueio por reputação (W-18): velocidade +X% fora de combate; primeiro uso do sistema de speed não-combat |
| [R] | **Batalha de companions** | Mod Souls (R-07) duelam em mini-arena automática — jogo dentro do jogo, totalmente idle |
| [R] | **Fotografia/espólio** | Screenshot mode com HUD oculto e poses; compartilhamento no chat |
| [W] | **Amigos e referência** | Lista de amigos com status/PM em qualquer mapa (base já existe em `social.ts`); bônus de XP por party com amigo |

### Operação, alcance e qualidade de vida

| Tag | Item | Ideia |
| :-- | :--- | :--- |
| [W] | **i18n (en/pt)** | Extracão de strings do cliente; servidor manda códigos, cliente traduz — pré-requisito para público fora do BR |
| [W] | **Espectador e replay** | Assistir chefe mundial/arena ao vivo; gravação de inputs no servidor para replay de cheater (alimenta W-10) |
| [W] | **Sharding preparatório** | Separar estado de mapa em módulo próprio antes de M5-04 — reduz risco do item grande |
| [R] | **PWA: prompt de instalação** | Fluxo "instalar como app" com ícone próprio e tela de offline amigável |
| [R] | **Pacotes de áudio e trilhas por mapa** | BGM por zona (Karakura, Seireitei, Hueco Mundo) com volume e mute persistentes |
| [R] | **HUD customizável** | Arrastar painéis, escala por elemento, presets salvos no servidor |

## Plano de specs

Quem escreve é o dono do item; aprovação é das duas pessoas. Ordem sugerida, cada spec em `docs/features/<nome>/` com PRD + ADRs no modelo de `features/cronicas-semanais-lore/`:

| Ordem | Spec | Dono | Destrava |
| :-- | :--- | :--- | :--- |
| 1 | Status e controle de grupo (M2) | Waldir | M2-01 a M2-07, R-05, W-01 |
| 2 | Colyseus 0.18 (critérios, migração, rollback) | Waldir | F-12 → M4, W-16, W-17 |
| 3 | Social: trade 1v1 (M3-01), abas (M3-02), filtro de loot (M3-03), banco de guilda (M3-04) | Rafael | M3 inteiro; M3-04 habilita W-17 e W-18 |
| 4 | Moderação de chat (M3-05) | Waldir | Portão G2 |
| 5 | Contas: recuperação de senha (M5-01) e limite persistente (M5-02) | Waldir | Portão G2 |
| 6 | Dungeons e salas instanciadas (M4) | Waldir | M4-01 a M4-03, W-16, W-17 |
| 7 | Conteúdo grande: Fullbringer (W-15), Hell (R-03), Kidō (R-05), Divisões (W-18) | dono do item | Expansões |
| 8 | E2E Playwright (M5-03), partição por mapa (M5-04) | Rafael / Waldir | Qualidade e escala |

## Como as filas se cruzam

As filas não se misturam, mas **dependem uma da outra** nestes pontos:

- **M1 em zigue-zague:** Rafael entrega M1-00/02/03 → Waldir faz M1-01/04/05/08/06 → Rafael faz M1-07 → Waldir fecha com M1-09.
- **M2 dividido por camada:** Waldir faz o motor (M2-01..05); Rafael faz a camada visual (M2-06, M2-07). O motor sai primeiro.
- **Conteúdo de Rafael que precisa de motor do Waldir:** R-05 precisa de M2-01..05; R-03/R-04 rendem mais com W-04 (chefes com fases); R-07 precisa de M1-04.
- **Social de Rafael que habilita mundo do Waldir:** M3-04 (banco de guilda) destrava parte de W-17 (guerra de guildas) e W-18 (divisões).
- **Instanciação é o gargalo comum:** F-12 → M4-01 destrava W-16, W-17 e qualquer conteúdo instanciado futuro.
- **Revisão cruzada obrigatória:** handler sensível e números de jogo são sempre revisados pela outra pessoa — é a forma oficial de um ajudar o outro sem puxar item.
