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

## Sugestões de próximos passos
1. **Pôr no ar** (Oracle grátis + DuckDNS, veja `DEPLOY.md`) e chamar amigos para testar: o jogo já tem conteúdo e sistemas suficientes.
2. **Balanceamento:** as curvas de XP, dano e loot nunca foram testadas por jogadores de verdade.
3. **Conteúdo:** mais missões, um chefe na Soul Society, interiores de prédios.
4. **Contas:** recuperação de senha por e-mail e moderação de chat antes de abrir para o público.

## Resultado da última bateria completa
`npm test`: **136 verificações OK** nos 18 cenários, e nenhuma exceção no servidor. As 2 verificações novas da expiração do mercado entraram no meio da rodada (o servidor de teste ainda tinha o código antigo). Rodadas de novo isoladas com `npx tsx scripts/test.ts market`: 11 de 11 OK.

---

# Manhã de 28/10: depois do "não pare"

Pesquisei o que os idles e o Tibia têm em comum que ainda faltava aqui: bestiário, conquistas, recompensa diária, analisador de caçada, venda automática de loot e eventos. Fiz tudo isso, mais forja, itens novos, um chefe e arte própria para os três mapas.

## Mecânicas novas
- **Livro** (botão "livro" ao lado do nome), com quatro abas:
  - **Bestiário:** 3 estágios por monstro (25/150/500 abates; chefes 1/5/15). Cada estágio dá +4% de dano contra ele e revela vida, XP e depois o loot. O último também dá +20% de chance de loot.
  - **Conquistas:** 19, com recompensa automática. As grandes são anunciadas no chat.
  - **Diário:** ciclo de 7 dias (o 7º dá Amuleto da Alma). Perder um dia zera a sequência. Um ponto vermelho no botão avisa quando a recompensa está esperando.
  - **Caçada:** XP, kan e abates por hora, e o loot coletado.
- **Forja do Kisuke** (aba nova na loja): fortalece o **espaço** de equipamento até +10 com Pedras de Reishi e kan. A chance cai a cada nível e, a partir de +5, falhar desce um nível. Trocar de item não perde a forja, e a morte não leva.
- **14 itens novos:**
  - 6 equipamentos;
  - Poções Grandes e Onigiri: o Auto Heal e os atalhos escolhem a menor poção que resolve;
  - **Pergaminho de Treino** (+50% de XP) e **Incenso da Sorte** (+30% de loot): 1 h cada, somando até 6 h, e contam offline;
  - **Caixa do Kisuke**, com prêmio surpresa.
- **Metastacia**, chefe novo no sul do Rukongai, e 3 missões novas (12 no total).
- **Auto Venda** no Auto Helper: o loot que não cabe no inventário vira kan na hora.
- **Invasão de Hollows:** de 3 em 3 horas, 12 Hollows e um Fishbone D cercam a praça de Karakura por 15 min, com +50% de XP e Caixas do Kisuke. O Auto Hunt prioriza os invasores.
- **Relatório da volta:** agora mostra também os abates e o loot da caçada offline.
- **Sons:** sintetizados no navegador, sem arquivos, com botão para silenciar.

## Arte nova (Codex, tudo na 1ª tentativa)
- **Metastacia** (folha 4x4).
- **Segunda folha de ícones:** 16 ícones (dois ficaram reservados).
- **Karakura com arte própria:** chão, quatro tipos de prédio (casa, prédio, loja, casa de madeira), árvores, bancos, máquina de bebidas, baú do depot e portão.
- **Hueco Mundo com arte própria:** areia, dunas, ruínas, ossadas, árvores de quartzo, rochas, colunas, crânio e a Garganta.
- **Traçado e colisão:** os dois mapas mantêm o traçado e a colisão de antes; conferi tile a tile. A única diferença são 3 enfeites novos na praça de Karakura.

## Encontrado no caminho
- **PR do Waldir:** entrou na `main` ([rafael2267/bleach-idle#1](https://github.com/rafael2267/bleach-idle/pull/1)) com Vitest e CI. Agora `npm test` roda os testes do Vitest, e a bateria de cenários virou `npm run test:scripts`. Os 76 testes dele passam com as mudanças.
- **Conquistas mudando as contas dos testes:** elas pagavam kan ao entrar, o que quebrava as contas de dinheiro de `bags` e `skull`. Os bots de teste agora nascem com as conquistas feitas.
- **Esperas fixas nos testes:** `items` e `quests` falhavam de vez em quando. Agora esperam até a condição acontecer.
- **Invasão atrapalhando outros cenários:** o teste deixava invasores vivos que atrapalhavam os cenários seguintes. Ele agora encerra o evento ao sair.

## Testes
Cenários novos: `progress`, `forge`, `hunt` e `invasion`; o `robust` passou a cobrir as mensagens novas.
## Resultado
`npm test` (Vitest): 76 de 76. `npm run test:scripts`: 180 de 180, sem exceção no servidor. CI do GitHub verde.

## Depois: missões diárias, ranking e balanceamento
- **Missões diárias:** 3 por dia, sorteadas por personagem e de acordo com o nível. Cada uma paga sozinha ao completar, e as três juntas dão uma Caixa do Kisuke. Ficam na aba Diário do livro.
- **Ranking:** abas novas de conquistas e de bestiário.

### Balanceamento: o jogo sobe rápido demais (precisa da sua decisão)
Fiz um simulador, `server/scripts/balance.ts`. Ele considera Ichigo em Shikai, com equipamento inicial, caçando sozinho o melhor monstro seguro para o nível, e respeita o tempo de renascimento.

| Nível | XP/h | Horas de caça acumuladas desde o 8 |
|---|---|---|
| 20 | 145 mil | 0,8 |
| 40 | 324 mil | 3,9 |
| 60 | 488 mil | 9,3 |
| 100 | 806 mil | 27,5 |

- **Ritmo:** com 12 h de hunt offline por dia, um jogador chega ao 100 em 2 ou 3 dias.
- **Conteúdo:** a partir do nível 45 a 50 o melhor lugar vira sempre o Arrancar, porque o conteúdo acaba aí.

Para não mudar o ritmo sem você decidir, deixei um ajuste: a variável **`EXP_RATE`** do servidor. O padrão é 1, então nada mudou. Com `EXP_RATE=0.25`, o nível 60 leva umas 37 h de caça. A minha sugestão é algo entre 0,25 e 0,4 quando o jogo for ao ar, mais um próximo bloco de conteúdo acima do nível 50. Dá para simular antes com `EXP_RATE=0.3 npx tsx scripts/balance.ts`.

Resultado: `npm test` 76 de 76 e `npm run test:scripts` 185 de 185.

## Las Noches: conteúdo acima do nível 45
O simulador mostrou que o conteúdo acabava no Arrancar. Para isso fiz o **quarto mapa, Las Noches**: o palácio em Hueco Mundo, para nível 45+ e 400 kan.
- **O mapa:** saguão seguro com a Garganta, salão com tapete vermelho e pilares até a sala do trono, duas alas com pilares e cantos tomados pela areia.
- **Monstros novos**, cada faixa rendendo mais XP que a anterior:
  - **Arrancar Números:** o melhor do nível 55 ao 70;
  - **Exequias:** do 75 em diante;
  - **Fracción:** o mais forte das alas;
  - **Privaron Espada:** o chefe, na sala do trono.
- **Missões:** 3 novas (15 no total).
- **Arte:** os 4 monstros e o tileset vieram do Codex, todos na 1ª tentativa.
- **Teste:** cenário novo `lasnoches`, que confere a viagem e os monstros.

Resultado: `npm test` 76 de 76 e `npm run test:scripts` 192 de 192.

## Antes de ir ao ar: conta e chat
- **Troca de senha** na tela de personagens. Ela pede a senha atual, conta tentativas erradas para o bloqueio e derruba os outros aparelhos lembrados.
- **`/ignorar Nome`** no chat: as mensagens dessa pessoa param de chegar, no público, na PM, na party e na guilda. A lista é salva com o personagem.
- **Corpos e sacolas sobrevivem a um reinício do servidor:** são salvos junto com o resto a cada 10 s e voltam com o mesmo prazo.
- **Testes:** cenário novo `account2`, e o `restart` agora confere o corpo depois da queda.

## Para quem chega
- **Primeiros passos:** personagem novo vê na barra lateral um guia de 6 tarefas, cada uma com uma pequena recompensa. O guia some quando termina e não aparece para quem já passou do nível 15.
- **Celular:** as janelas do livro e do ranking começam abaixo do botão do menu, que antes cobria o título. Conferi a 375 px de largura, e a página não rola para os lados.
- **Tela de entrada:** login e lista de personagens ganharam uma ilustração de fundo (Karakura à noite, lua cheia e Hollows nos telhados), gerada pelo Codex.

Resultado: `npm test` 76 de 76 e `npm run test:scripts` 204 de 204.

## CI do GitHub: três falhas que eu não tinha visto
Três pushes desta manhã ficaram vermelhos no CI, todos por testes que dependiam de tempo e passavam aqui. Nenhum era bug do jogo:
- **`death`:** o personagem do teste de morte offline às vezes morria nos 300 ms **antes** de sair. Aí a morte era online, não havia relatório offline, e o teste esperava para sempre.
- **Relatório offline (`death`, `bot`, `training`, `restart`):** o handler era registrado depois de entrar, e a mensagem às vezes chegava antes. Agora há o `playWithReport`, que escuta desde a entrada.
- **`restart`:** os bots começavam na praça e gastavam a janela de 10 s andando até os monstros. Agora começam na floresta, e o teste espera até a condição.
- **`quests` e `progress`:** esperas fixas viraram esperas até a condição. Se o `quests` voltar a falhar, ele imprime um diagnóstico (posição, alvo e monstros vivos).
- **Runner:** o limite por cenário passou de 180 s para 300 s, para o CI, que é mais lento.
- **Auto Hunt e missão diária:** isto saiu do mesmo problema. O Auto Hunt não sabia da missão diária e caçava outro Hollow. Agora ele prioriza o monstro da missão diária de caça, como já fazia com as missões do Kisuke.

## "Dopamina barata, mas sempre com mais o que fazer"
A taxa de XP ficou como estava, como você decidiu. Pesquisei como outros idles seguram o público:
- **Começo:** muito rápido.
- **Meio:** ritmo por faixas de tempo.
- **Retenção:** renascimento (prestígio) como motor, e expansões que sobem o teto (o Melvor Idle fez isso com o nível 120).

Daí vieram:
- **Renascimento:** a partir do nível 60, volta ao 8 com bônus permanentes (+10% de XP, +5% de dano e +5% de vida por renascimento) e mantém tudo. O equipamento forte continua no corpo, então a subida seguinte é bem mais rápida. Aparece no nome (✦), no ranking e em 2 conquistas.
- **Marcos de nível:** kan a cada 5 níveis novos e Caixa do Kisuke a cada 10. Só o nível mais alto já alcançado conta, para o renascimento não virar fazenda de recompensa.
- **Dangai, o desafio sem fim**, um quinto mapa com arte própria:
  - **Andares:** cada um traz monstros só seus. Vai até o Arrancar mais forte e depois cresce 12% por andar, sem teto, com chefe a cada 10.
  - **Recompensa:** cada andar paga, e o recorde paga em dobro. Morrer lá não tira nada.
  - **Recomeço:** sempre um pouco abaixo do recorde.
  - **Idle:** com Auto Hunt, sobe sozinho, inclusive offline.
  - **Ranking:** aba própria.
- **Testes novos:** `rebirth` e `dangai`.

Resultado: `npm test` 76 de 76 e `npm run test:scripts` 226 de 226.

### Bug real achado pelo CI: Auto Hunt travado
O `quests` seguia falhando de vez em quando no CI: na mesma party, o Beto fazia 10 abates e a Ana travava em 6. A causa é um bug do jogo, não do teste. Quando o alvo não tem caminho (cercado de árvores ou de outros monstros), o personagem ficava parado com aquele alvo **para sempre**, e numa hunt offline isso perdia horas de caçada. Agora, depois de 3 s sem caminho, o Auto Helper larga o alvo e ignora aquele monstro por 20 s. Se o teste voltar a falhar, a própria linha de falha mostra a posição, o alvo e os monstros vivos.

## Conjuntos de equipamento
Mais uma meta curta com recompensa visível: peças do mesmo conjunto equipadas juntas dão bônus.
- **Uniforme Shinigami:** é o kit inicial, então todo personagem novo já vê o efeito.
- **Traje de Capitão, Herança Hollow e Lua Negra:** dão motivo para caçar peça por peça.
- **Testes do Waldir:** o `equipBonus` continua só somando os itens, como eles esperam. O bônus de conjunto entra numa função nova, `gearBonus`, usada no servidor.

### Mais uma falha intermitente explicada: `quests`
O diagnóstico novo mostrou que a Ana do teste **morria**: ela entrava só com os fragmentos no inventário, sem poção para o Auto Heal usar. E, para voltar ao Kisuke, ficava cercada ou em combate. Agora ela tem poções e volta reentrando ao lado da loja. Rodei 3 vezes seguidas sem falha, e a bateria completa deu 229 de 229.

## Menus bonitos: kit de interface próprio
Os menus pareciam um site genérico escuro. Gerei no Codex um kit de interface em pixel art no tema dos shinigami (preto laqueado, prata e vermelho, cantos em forma de tsuba):
- **Peças:** moldura de painel, botões vermelho e preto (normal, passar o mouse e pressionado), espaço de inventário (com versão realçada em azul), moldura de barra e 16 ícones de menu.
- **Processamento:** `art/ui.py` recorta e reduz cada peça. Nos ícones, todas as partes ficam e o magenta interno some, porque o primeiro recorte perdeu uma das setas e deixou magenta na engrenagem e na ampulheta.
- **Aplicação:** a camada `client/src/theme.css` usa molduras de 9 partes (as janelas em 2x, a lateral e o chat em 1x), a fonte pixel Pixelify Sans (licença OFL, pelo npm) nos títulos e botões, e ícones nos títulos das seções, nas abas e nos atalhos do topo (livro, ranking, som e trocar).
- **Onde:** login, lista de personagens, barra lateral, Kisuke (loja, forja, missões e mercado), livro, ranking, Dangai, tela de morte, menu de contexto, chat, minimapa, caixas de seleção e barras de rolagem.
- **Conferido no navegador:** login, personagens, lateral inteira, Kisuke e livro. No celular (375 px) também, sem rolagem para os lados.

## Sprites, efeitos e o andar esquisito
- **Por que o andar era esquisito:** o servidor anda em ticks de 100 ms, então um passo de 260 ms acontece, na prática, a cada 300 ms. O cliente deslizava o sprite em 260 ms e parava 40 ms ("anda, trava, anda"). E cada pacote que chegava atrasado reiniciava o deslize, mudando a velocidade.
- **A correção:** agora cada personagem e monstro desliza em velocidade constante no ritmo real, acelerando um pouco só quando está atrasado. A animação de passos segue o mesmo ritmo, e parado ele respira (escala sutil).
- **Efeito colateral do mesmo motivo:** velocidades nominais entre 240 e 300 ms viram todas 300 na prática. Levei isso em conta nos personagens novos.
- **Efeitos animados** (3 folhas do Codex): corte e impacto, o atacante avançando no golpe, habilidade própria de cada personagem, fumaça com ossos na morte do Hollow, luz de nível, cura e aura de Bankai por personagem.
- **Personagens novos:**
  - **Ishida** (Quincy): arco de longe e barato, com o Letzt Stil como liberação;
  - **Sado:** o mais forte e resistente, de ataque lento, com o Diablo como liberação.

  Cada um tem folha de andar nas duas formas e efeito de habilidade próprio (flecha e soco). O texto de transformação usa o nome certo de cada liberação.
- **Conferido no navegador:** aura, gelo, impactos e fumaça em combate real, e a tela de criação com os 5 personagens. O Ishida foi criado e caçou; as animações dele carregam, mas o painel do navegador estava escondido nessa hora e não deu para fotografar.

Resultado: `npm test` 76 de 76 e `npm run test:scripts` 229 de 229.
