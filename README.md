# Bleach Idle: protótipo

MMORPG 2D de visão de cima com automação (no estilo do DBO Idle), no universo de Bleach. Projeto de fã, sem fins lucrativos.

## Rodar

```bash
npm install
npm run dev        # servidor em ws://localhost:2567 e cliente em http://localhost:5173
npm test           # testes unitários e E2E (Vitest), os mesmos do CI
npm run test:scripts   # bateria de cenários de jogo (sobe um servidor de teste isolado)
npm run build && npm start   # modo de produção: tudo em http://localhost:2567
```

Para pôr no ar, veja **[DEPLOY.md](DEPLOY.md)** (Docker, HTTPS automático, backups, opções de hospedagem e preços).

Dica: `http://localhost:5173/?login` abre direto o login (para entrar com outra conta sem apagar o login lembrado), e `?toque` mostra os controles de celular no computador.

## Stack
- **client/**: Phaser 3 + TypeScript + Vite. Só desenha o estado e envia intenções. Também é um app instalável (PWA).
- **server/**: Node + Colyseus 0.15, **autoritativo**, com tick de 100 ms: movimento, combate, XP, IA dos monstros, Auto Helper, treino e missões. Em produção, entrega também a página do jogo.
- **shared/**: leitura dos mapas do Tiled, personagens, monstros, itens, missões, treino e fórmulas.
- **client/public/maps/**: os mapas (`karakura.tmj`, `hueco.tmj`, `soul.tmj`, `lasnoches.tmj`), feitos para abrir e editar no [Tiled](https://www.mapeditor.org/). Cliente e servidor leem os mesmos arquivos.
- **art/**: arte gerada pelo Codex (`art/raw/`, prompts em `art/raw/prompts.md`) → `art/process.py` → `client/public/assets/`. Os mapas saem de `art/maps/build_maps.py`.
- **Banco:** SQLite (`node:sqlite`, modo WAL) com contas, sessões, personagens, guildas e parties. Save a cada 10 s, em transação, e também ao entrar, sair e morrer.

## O que o jogo tem
**Contas e personagens**
- **Login e senha:** hash scrypt; bloqueio de 1 min depois de 5 senhas erradas (30 por IP); "Lembrar neste navegador" com token de 30 dias. Troca de senha na tela de personagens (derruba os outros aparelhos lembrados).
- **Personagens:** até 5 por conta, com nome único: Ichigo, Rukia ou Renji.
- **Primeiros passos:** personagem novo vê na barra lateral um guia de 6 tarefas (derrotar um Hollow, ligar o Auto Hunt, visitar o Kisuke, aceitar uma missão, pegar a diária, soltar o Bankai), cada uma com uma pequena recompensa.
- **Entrada no mundo:** por ingresso de uso único. Se o mesmo personagem abre em outra janela, a nova assume.

**Mundo**
- **Karakura** (arte própria, gerada pelo Codex): cidade japonesa com casas, prédios e lojas, praça central (zona segura, depot, loja do Kisuke, portal Senkaimon) e Hollows a leste e ao sul.
- **Soul Society** (arte própria, gerada pelo Codex): Seireitei com quartéis, muro, jardim zen, cerejeiras e campo de treino; Rukongai com Hollows de nível médio. Nível 14+, 120 kan.
- **Hueco Mundo** (arte própria, gerada pelo Codex): deserto branco com ruínas, árvores de quartzo e ossadas; lá vivem Adjuchas, Arrancar e o Menos Grande (Gillian). Nível 22+, 200 kan, chegando pela Garganta.
- **Las Noches** (arte própria, gerada pelo Codex): o palácio em Hueco Mundo, para nível 45+ (400 kan). Tem saguão seguro, salão com pilares e alas com Arrancar Números, Exequias e Fracción; na sala do trono fica o chefe **Privaron Espada**.
- **Invasão de Hollows:** de 3 em 3 horas, 12 Hollows e um Fishbone D cercam a praça de Karakura por 15 min, com +50% de XP e chance de Caixa do Kisuke (o líder sempre dá uma). Eles não renascem; o chat anuncia quem mais abateu.
- **Viagem:** pelos portais. "Voltar à cidade" (tecla R) leva ao templo de Karakura.

**Combate e progressão**
- **Níveis:** fórmula do Tibia, começando no nível 8. Shikai/Bankai na tecla T (nível 10+), com mais dano e velocidade, mas gastando reiatsu.
- **Monstros:** 18 tipos, mais o boneco de treino, todos com sprite próprio. Chefes: Grand Fisher (Karakura), Metastacia (sul do Rukongai), Gillian (Hueco Mundo) e Privaron Espada (Las Noches).
- **Treino:** **Zanjutsu** sobe com golpes e aumenta o dano corpo a corpo (+2%/nível). **Reiryoku** sobe com o reiatsu gasto e aumenta o dano das habilidades (+3%/nível). O **Auto Treino** queima o reiatsu parado, e os **bonecos de treino** da Soul Society não morrem. Os dois continuam offline.
- **Morte (estilo Tibia):** perde 8% de XP, 10% do dinheiro carregado e cada item tem 10% de chance de cair. O que cai fica num **corpo no chão** por 5 minutos (sobrevive a um reinício do servidor); em PvP, quem matou (e a party dele) tem prioridade por 1 minuto. O **Amuleto da Alma** protege tudo, e o depot nunca perde nada.
- **Missões do Kisuke:** 15, de caçar ou entregar itens, com XP, kan e itens de recompensa. O progresso de caça conta para a party, e o Auto Hunt prioriza os monstros das missões (do Kisuke e a diária de caça).

**Progresso de longo prazo** (botão "livro" ao lado do nome)
- **Bestiário:** cada monstro tem 3 estágios (25/150/500 abates; chefes 1/5/15). Cada estágio dá +4% de dano contra ele, revela vida, XP e loot, e o último dá +20% de chance de loot. Abates da party contam para todos.
- **Conquistas:** 19 (nível, abates, chefes, bestiário, missões, treino, PvP, dias seguidos), com recompensa automática. As grandes são anunciadas no chat.
- **Missões diárias:** 3 por dia, sorteadas de acordo com o nível (caçar um monstro da sua faixa, abates no geral, kan caçando, um chefe ou usar a forja). Cada uma paga kan e XP sozinha; as três juntas dão uma Caixa do Kisuke.
- **Recompensa diária:** o botão "livro" ganha um ponto vermelho quando ela está esperando. Ciclo de 7 dias (o 7º dá Amuleto da Alma). Perder um dia zera a sequência; o dia vira à meia-noite de Brasília.

**Itens**
- **Itens:** 29, mais o kan. 7 espaços de equipamento e 20 de inventário.
- **Loot:** vai direto para o inventário, o que funciona também offline. O que não couber vira uma **sacola no chão**, reservada a quem matou por 1 minuto.
- **Praça:** depot de 60 espaços e loja com "Vender todo o loot".
- **Forja do Kisuke:** fortalece o **espaço** de equipamento até +10 com Pedras de Reishi e kan (arma +2 de ataque por nível, anel e amuleto +10 de vida, o resto +1 de defesa). A chance cai a cada nível e, a partir de +5, falhar desce um nível. Trocar de item não perde a forja e a morte não leva.
- **Consumíveis novos:** Onigiri, Poção Grande de Cura e de Reiatsu (o Auto Heal e os atalhos escolhem a menor poção que resolve), **Pergaminho de Treino** (+50% de XP por 1 h), **Incenso da Sorte** (+30% de loot por 1 h; os dois somam até 6 h e contam offline) e **Caixa do Kisuke** (prêmio surpresa).
- **Equipamentos novos:** Elmo de Osso, Botas de Shunpo, Hakama de Capitão, Zanpakutō Lua Negra, Anel Espiritual e Talismã de Kidō, dos Hollows mais fortes e dos chefes.
- **Visual:** Haori de Capitão e Máscara de Osso mudam o sprite, e todos veem. Rukia e Renji têm sprite próprio no Bankai.
- **Mercado entre jogadores** (aba no Kisuke): anuncie itens do inventário com preço por unidade; o item fica guardado até alguém comprar ou você cancelar. Taxa de 5% na venda, e o vendedor recebe mesmo fora do jogo. Anúncio sem comprador por 7 dias volta para o depot.

**Social**
- **Party:** até 4, com XP dividida (+10% por membro, regra de 2/3 do nível). Sobrevive a um reinício do servidor.
- **PvP em mundo aberto:** a partir do nível 10, fora da zona segura, com dano pela metade. Quem ataca fica **marcado** por 3 min, sem viajar nem entrar na zona segura. O Auto Helper revida.
- **Caveira (☠):** matar quem não atacou ninguém vira **assassino** por 15 min (somando até 2 h). O assassino não pode viajar, e qualquer um pode atacá-lo sem ser marcado. Se morrer, perde 50% de chance por item e 30% do dinheiro, e o Amuleto da Alma não protege. Atacar ou matar quem está marcado ou é assassino é defesa e não pune.
- **Guildas:** `/guilda criar Nome` (500 kan, nível 10+), convites, banco, líder e tag no nome.
- **Chat:** `/pm Nome, msg`, `/p` (party), `/g` (guilda), `/ignorar Nome` (para de receber as mensagens dessa pessoa) e `/ajuda`.
- **Ranking:** nível, abates em PvP, guildas, conquistas e bestiário.

**Automação (Auto Helper)**
- Auto Target, Auto Hunt, Auto Heal (%), Auto Treino e **Auto Venda** (o loot puro que não cabe no inventário vira kan na hora, em vez de cair numa sacola).
- **Analisador de caçada** (livro → Caçada): XP, kan e abates no total e por hora, e o loot coletado. Conta também a caçada offline.
- Com Auto Hunt ou Auto Treino, fechar o jogo não tira o personagem do mundo (até 12 h). Na volta chega um relatório de tempo, abates, XP, kan, loot, habilidades e mortes.
- Isso sobrevive a reinício e queda do servidor.

**Interface**
- **Sons** sintetizados no navegador (golpe, dano, habilidade, loot, nível, Bankai, eventos), com botão "som" para silenciar.
- Minimapa no canto (você, party, outros jogadores e monstros); clique nele para andar até lá.

**Celular**
- Joystick e botões de ação em telas de toque, menu lateral recolhível e app instalável (PWA).

## Editar os mapas no Tiled
Abra `client/public/maps/*.tmj` no Tiled (1.10+), edite e salve no mesmo formato (.tmj, tileset embutido). Depois recarregue o cliente e reinicie o servidor.
- **Camadas de tiles:** `chao` (piso), `objetos` (bloqueiam se o tile tiver `solido = true`) e `acima` (copas e topos, por cima dos personagens, sem colisão).
- **Camada de objetos `logica`**, pelo tipo (classe) do objeto:
  - `templo` (obrigatório em Karakura);
  - `pz` (retângulo da zona segura);
  - `depot`;
  - `loja` (o nome aparece sobre o NPC);
  - `portal`;
  - `chegada` (o nome é o id do destino em `shared/src/social.ts`);
  - `spawn` (propriedades `monstro`, `raio` e `quantidade`).
- **Mapa novo:** acrescente o id em `MAP_IDS` (`shared/src/map.ts`), crie o `.tmj` e um destino em `TRAVEL`.
- **Primeira versão:** `art/maps/build_maps.py` gera os 4 mapas do zero. **Depois de editar no Tiled, não rode o script**, porque ele sobrescreve os arquivos.
- **Conferir:** `cd server && npx tsx scripts/mapcheck.ts` checa os mapas (objetos obrigatórios, chegadas e muro sem frestas).

## Testes

### Testes rápidos e unitários (Vitest)
Executa de forma rápida e isolada (em memória, sem dependência de portas ou banco local):
```bash
npm test             # roda a suíte de testes automatizados com Vitest
npm run test:watch   # modo observador interativo
```

### Bateria completa de cenários de integração
`npm run test:scripts` sobe um servidor isolado (porta 2577, banco temporário), roda todos os cenários e sai com erro se alguma verificação falhar. Para rodar só alguns: `cd server && npx tsx scripts/test.ts social quests`.

Cenários em `server/scripts/`:
- **Mapas:** `mapcheck`.
- **Contas:** `accounts`.
- **Combate e personagem:** `bankai`, `outfit`, `death`, `training`, `spawncount`.
- **Itens, missões e economia:** `items`, `quests`, `bags` (corpos e sacolas), `market` (mercado), `forge` (forja, pergaminho, caixa e escolha da poção).
- **Progresso:** `progress` (bestiário, conquistas e recompensa diária), `hunt` (Auto Venda, analisador, aviso da diária e missões diárias) e `invasion` (evento).
- **Mapas:** `lasnoches` (viagem e monstros do palácio).
- **Robustez:** `robust` (lixo em todas as mensagens, rajada de 500, mensagem acima de 4 KB). O runner também conta como falha qualquer exceção registrada pelo servidor.
- **Social:** `social` (party, PvP, viagem), `social2` (chat, guildas, ranking) e `skull` (caveira).
- **Offline e queda:** `bot` (hunt offline) e `restart` (queda do servidor com hunts e party).

**Balanceamento:** `cd server && npx tsx scripts/balance.ts [personagem] [nível]` simula, nível a nível, o melhor monstro para caçar, o XP por hora e as horas acumuladas. Não precisa de servidor. A taxa de XP do servidor é a variável `EXP_RATE` (padrão 1; `EXP_RATE=0.3` simula e aplica 30%).

Avulsos (com o servidor rodando): `partner.ts` (um bot que aceita convites de party) e `peek.ts` (lista os jogadores no mundo).

## Créditos
Toda a arte do jogo foi gerada pelo Codex para este projeto. Os pacotes CC0 da Kenney ([Roguelike Modern City](https://kenney.nl/assets/roguelike-modern-city) e [Roguelike RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack); licenças em `art/maps/kenney/`) seguem no repositório porque o `build_maps.py` volta a usá-los se a arte própria faltar.

## Limitações conhecidas
- **Contas:** sem e-mail, então não há recuperação de senha esquecida. A moderação de chat se resume ao `/ignorar`.
- **Servidor:** ingressos e limite de tentativas ficam na memória do processo (um servidor só). Numa queda brusca se perdem até ~10 s de progresso.
- **Arte:** não há interiores de prédios nem andares.
- **Sprites:** só haori e máscara mudam o visual do personagem.
- **Mercado:** não há troca direta entre jogadores.
- **Servidor:** limite de 40 mensagens/s por cliente e de 4 KB por mensagem; mensagens acima disso derrubam só a conexão de quem mandou.
