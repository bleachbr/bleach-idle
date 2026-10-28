# Relatório da noite (27 → 28/10/2026)

Trabalho feito sem você, sem gastar nada e sem contratar serviço nenhum. Tudo está em commits na `main` do repositório privado `rafael2267/bleach-idle`.

## Resumo
| Commit | O quê |
|---|---|
| `af5c18a` | Testes automáticos (`npm test`), parties salvas no banco, relógio do PvP pelo servidor, chat por canal, guildas, ranking, 9 missões do Kisuke |
| `5842519` | Celular (joystick, botões, menu recolhível, PWA) e **Soul Society**, terceiro mapa com arte própria do Codex |
| `ab10a5b` | Pronto para ir online sem contratar nada: servidor entrega o jogo, `/healthz`, backups, Docker, Caddy (HTTPS) e `DEPLOY.md` |
| `b2b76ba` | Treino (Zanjutsu, Reiryoku, Auto Treino, bonecos), corpos e sacolas no chão, Bankai próprio da Rukia e do Renji, sprites do Grand Fisher, Fishbone D e 3 Hollows |
| `fa9079c` | **Revisão de robustez:** corrige uma mensagem que derrubava todos os jogadores, limite de mensagens, tratamento de exceções |
| `276f11e` | Minimapa, **mercado entre jogadores** e abas na janela do Kisuke |
| `f00dd28` | **Caveira (☠)** no PvP: abate injusto vira assassino |
| `2ea638c` | Sprites próprios para todos os Hollows de Karakura |

## Mecânicas novas
- **Missões do Kisuke (9):** caçar ou entregar itens, com XP, kan e itens. O progresso de caça conta para a party, e o Auto Hunt prioriza os monstros das missões ativas.
- **Guildas:** criar (500 kan, nível 10+), convidar, sair, expulsar, passar liderança e banco (todos depositam, só o líder saca). A tag aparece no nome.
- **Chat por canal:** `/pm Nome, msg`, `/p`, `/g` e `/ajuda`.
- **Ranking:** nível, abates em PvP e guildas.
- **Treino estilo DBO:**
  - **Zanjutsu** sobe com golpes e dá +2% de dano corpo a corpo por nível;
  - **Reiryoku** sobe com o reiatsu gasto e dá +3% de dano de habilidade por nível;
  - **Auto Treino** queima o reiatsu parado;
  - os **bonecos de treino** da Soul Society não morrem;
  - tudo isso continua offline.
- **Corpos e sacolas:** o que se perde na morte cai no chão (em PvP, quem matou tem 1 minuto de prioridade). O loot que não cabe no inventário vira uma sacola.
- **Mercado entre jogadores:** anunciar, comprar e cancelar, com taxa de 5%. O vendedor recebe mesmo fora do jogo. Anúncio parado por 7 dias volta para o depot.
- **Caveira (☠):** quem mata alguém que não atacou ninguém vira assassino por 15 min (somando até 2 h). O assassino não pode viajar, qualquer um pode atacá-lo sem punição e, se morrer, perde mais (o Amuleto da Alma não salva). Defender-se não pune.
- **Minimapa:** clique nele para andar até o ponto.
- **Celular:** joystick, botões de ação, menu recolhível e app instalável.

## Arte nova (Codex, tudo na 1ª tentativa)
- **Soul Society:** texturas de chão, quartel, muro, cerejeira, pinheiro e lanterna.
- **Personagens e monstros:** boneco de treino; Bankai da Rukia e do Renji; Grand Fisher e Fishbone D; os 8 Hollows de Karakura (nenhum monstro usa mais o sprite recolorido).
- **Pipeline:** paleta compartilhada passou para 48 cores, e tons escuros com cor de verdade não são mais dessaturados (o Hollow Ácido voltou a ser verde).

## Bugs encontrados e corrigidos
- **Grave:** uma mensagem `step` com a direção em texto (`"2"` em vez de `2`) quebrava a codificação do estado e **derrubava todos os jogadores** da sala. Qualquer pessoa poderia fazer isso. Agora só entra número inteiro de 0 a 3, e o teste `robust` cobre o caso.
- **Exceções derrubando o processo:** os rooms não tinham `onUncaughtException`, então um erro inesperado ao tratar uma mensagem derrubaria o servidor. Agora é registrado e o servidor segue.
- **Sem limite de mensagens:** um cliente podia mandar milhares por segundo (cada `move` faz uma busca de caminho). Agora há limite de 40/s por cliente, e o excesso é descartado.
- **Erro de WebSocket no console:** o relógio do cliente seguia mandando mensagem depois de sair do jogo.
- **Monstro morrendo duas vezes no mesmo tick:** pagava XP e loot em dobro e criava monstros a mais. Corrigido.
- **Limite de login por IP** derrubava a própria bateria de testes. Agora é configurável; o padrão para jogadores segue 30.
- **Testes que passavam por sorte** (`items`, `bot`) agora são determinísticos.
- **Janela do Kisuke fechando sozinha logo após abrir:** a posição de abertura vinha de um valor que só se atualiza depois que a cena termina de carregar. Se a janela abria antes, ficava guardado (0,0), e a primeira atualização "afastava" o personagem e fechava a janela. Agora a posição vem do estado na hora de abrir. Isso apareceu numa checagem no navegador com o carregamento lento.
- **Arte antiga presa no app instalado:** o service worker servia a arte só do cache e os nomes dos arquivos não mudam entre versões, então quem instalou o app nunca veria sprites novos. Agora serve do cache e atualiza em segundo plano.

## Testes
`npm test` sobe um servidor isolado e roda **18 cenários** (138 verificações). Além das verificações, conta como falha qualquer exceção registrada pelo servidor.
- **Mapas:** `mapcheck`.
- **Robustez:** `robust` (fuzz de payloads em todas as mensagens, rajada de 500, mensagem acima de 4 KB).
- **Contas e combate:** `accounts`, `bankai`, `outfit`, `death`, `training`, `spawncount`.
- **Itens, missões e economia:** `items`, `quests`, `bags`, `market`.
- **Social:** `social`, `social2`, `skull`.
- **Offline e queda:** `bot`, `restart`.

Resultado da última bateria completa: veja o fim deste arquivo.

## O que ficou pendente ou não verificado
- **Online:** nada foi contratado. O `Dockerfile` não foi construído (o Docker não está instalado aqui). O modo de produção sem Docker foi testado. O passo a passo está em `DEPLOY.md`.
- **Navegador:** os testes visuais foram limitados, porque o painel do navegador estava escondido e o jogo não desenha quadros nesse estado. A lógica foi coberta pelos testes automáticos, mas vale você abrir e olhar o minimapa, o mercado, a caveira e os corpos no chão.
- **Memória:** corpos e sacolas no chão somem se o servidor reiniciar.

## Sugestões de próximos passos
1. **Pôr no ar** (Oracle grátis + DuckDNS, veja `DEPLOY.md`) e chamar amigos para testar: o jogo já tem conteúdo e sistemas suficientes.
2. **Balanceamento:** as curvas de XP, dano e loot nunca foram testadas por jogadores de verdade.
3. **Conteúdo:** mais missões, um chefe na Soul Society, interiores de prédios.
4. **Contas:** recuperação de senha por e-mail e moderação de chat antes de abrir para o público.

## Resultado da última bateria completa
`npm test`: **136 verificações OK** nos 18 cenários, e nenhuma exceção no servidor. As 2 verificações novas da expiração do mercado entraram no meio da rodada (o servidor de teste ainda tinha o código antigo). Rodadas de novo isoladas com `npx tsx scripts/test.ts market`: 11 de 11 OK.
