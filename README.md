# Bleach Idle: protótipo

MMORPG 2D de visão de cima com automação (no estilo do DBO Idle), no universo de Bleach. Projeto de fã, sem fins lucrativos.

## Rodar

```bash
npm install
npm run dev
```

O servidor sobe em `ws://localhost:2567` e o cliente em http://localhost:5173. Abra duas abas com nomes diferentes para ver o multiplayer.

## Stack
- **client/**: Phaser 3 + TypeScript + Vite. Só desenha o estado e envia intenções.
- **server/**: Node + Colyseus 0.15, **autoritativo**, com tick de 100 ms. Movimento, combate, XP, IA dos monstros e Auto Helper rodam aqui.
- **shared/**: mapa (gerado de forma determinística, igual nos dois lados), personagens, monstros, spawns e fórmulas.
- **art/**: pipeline de sprites (Codex `image_gen` → `art/process.py` → `client/public/assets/sprites/`). Veja `art/RELATORIO.md`.
- Save em SQLite (`server/bleach-idle.sqlite`, via `node:sqlite`, modo WAL): contas, sessões e personagens. Save a cada 10 s, em transação, e também ao entrar e ao sair.

## O que já funciona
- **Contas:** login e senha (hash scrypt com salt; a senha nunca é guardada); bloqueio de 1 min depois de 5 senhas erradas no mesmo login (30 por IP); "Lembrar neste navegador" com token de sessão de 30 dias (no banco fica só o hash do token); "Sair da conta" invalida o token.
- **Personagens:** até 5 por conta, nome único no servidor, criação com escolha entre Ichigo, Rukia e Renji, exclusão (bloqueada enquanto ele caça offline). A lista mostra quem está "caçando offline".
- **Entrada no mundo** só com ingresso de uso único (60 s) emitido pelo lobby para um personagem da própria conta. Se o mesmo personagem entra de outra janela, a nova assume e a antiga é desconectada.
- **Hunt offline sobrevive a reinício e a queda:** cada personagem tem a marca `in_world` no banco; ao subir, o servidor recoloca no mundo, caçando offline, todos que estavam com Auto Hunt, inclusive quem estava online quando o servidor caiu. O relatório na volta soma o que foi ganho antes e depois da queda (o tempo em que o servidor ficou fora não rende XP).
- Mapa de Karakura (64x48): cidade com praça central (zona de proteção e renascer, com o baú do depot e a loja do Kisuke), rio com ponte e hunts a leste e ao sul.
- 3 personagens (Ichigo, Rukia, Renji), sprites 48x48 sobre tiles de 32, andar em 4 direções.
- Shikai/Bankai (tecla T, a partir do nível 10): mais dano, mais velocidade e dreno de reiatsu; sem reiatsu, o Bankai se desfaz.
- 10 monstros (um sprite de Hollow com variação de cor e tamanho), aggro, perseguição, leash e respawn; o Grand Fisher é o chefe.
- Níveis com a fórmula do Tibia e começo no nível 8.
- **Morte (estilo Tibia):** sem proteção, perde 8% do XP, 10% do dinheiro carregado e cada peça equipada e cada espaço do inventário tem 10% de chance de sumir. O depot nunca perde nada. Aparece uma tela com tudo o que foi perdido; morrendo na hunt offline, o personagem sai do mundo e a tela aparece na volta.
- Habilidade especial (1), Poção de Cura (2), Poção de Reiatsu (3), Tab para o próximo alvo, Esc para soltar o alvo, WASD ou clique para andar, chat.
- **Itens:** 15 itens (`shared/src/items.ts`) e moeda (kan); 7 slots de equipamento (ataque, defesa, HP e reiatsu); inventário de 20 espaços com pilhas de até 100.
- **Loot:** cada Hollow tem sua tabela; o loot vai **direto para o inventário** de quem matou, o que faz funcionar também na hunt offline. Inventário cheio = item perdido (aviso no chat).
- **Depot** (baú na praça, 60 espaços) e **loja** (NPC Kisuke): clique neles e o personagem anda até lá e abre a janela. Compra, venda item a item e "Vender todo o loot". O servidor confere distância, dinheiro e espaço.
- **Kit inicial** no estilo do DBO: bandana, shihakushō, hakama, waraji, 10 Poções de Cura, 3 de Reiatsu, 2 Amuletos da Alma e 150 kan.
- **Amuleto da Alma** (o "Band of Loss" daqui): se morrer com ele equipado, não perde XP, itens nem dinheiro; o amuleto some.
- **Equipamento muda o visual:** Haori de Capitão (casaco branco) e Máscara de Osso (máscara de Hollow) trocam a folha de sprites do personagem, e todos os jogadores veem (campo `look` sincronizado). As 9 folhas (3 personagens × haori, máscara e os dois) foram geradas pelo Codex como edição das folhas base. O Bankai do Ichigo tem roupa própria e não muda.
- **Party:** clique em outro jogador → "Convidar para a party" (até 4; líder com ★; membros em verde). XP de cada Hollow é dividida entre os membros vivos a até 12 tiles de onde ele morreu, com +10% por membro extra, se o menor nível for pelo menos 2/3 do maior (regra do Tibia); senão vai tudo para quem matou, com aviso. Loot continua indo para quem matou. Sair, expulsar (líder) e passar a liderança ao sair.
- **PvP em mundo aberto:** clique em outro jogador → "Atacar". A partir do nível 10, fora da praça, nunca contra a própria party; dano entre jogadores pela metade. Quem ataca fica 3 min **sem viajar, sem "Voltar à cidade" e sem entrar na praça** (nome em vermelho e contador na barra lateral). O Auto Helper revida quem o atacou, inclusive caçando offline. Morrer para jogador segue as regras normais de morte.
- **Viagem:** portal Senkaimon na praça leva à Floresta Leste (nível 8, 30 kan), Além do Rio (12, 60 kan) e Toca do Grand Fisher (20, 120 kan). "Voltar à cidade" (tecla R) leva ao templo de qualquer lugar: recarga de 60 s, bloqueado 10 s depois de combate e durante o bloqueio de PvP.
- **Auto Helper:** Auto Target, Auto Hunt (procura e persegue alvos em até 30 tiles e usa a habilidade) e Auto Heal (%).
- **Hunt offline:** com o Auto Hunt ligado, fechar a aba (ou clicar em "trocar") não tira o personagem do mundo (até 12 h). Ao voltar, chega um relatório de tempo, XP e kan.

Dica: `http://localhost:5173/?login` abre direto o login (para entrar com outra conta sem apagar o login lembrado).

## Testes rápidos (com o servidor rodando)
Os scripts criam contas `bot_<nome>` sozinhos (senha de teste em `server/scripts/lib.ts`).
```bash
cd server && npx tsx scripts/accounts.ts # cadastro, senha errada, bloqueio, token, nomes, ingresso, duas janelas
cd server && npx tsx scripts/restart.ts antes    # A caça offline, B fica online caçando; derrube o servidor
cd server && npx tsx scripts/restart.ts depois   # depois de subir de novo: A e B voltaram a caçar + relatório
cd server && npx tsx scripts/bot.ts      # entra, caça, desconecta, volta e mostra o XP offline
cd server && npx tsx scripts/bankai.ts   # cria um save de nível 12 e testa o Bankai
cd server && npx tsx scripts/peek.ts     # lista os jogadores no mundo
cd server && npx tsx scripts/items.ts    # kit, loja, depot, loot da hunt e venda
cd server && npx tsx scripts/death.ts    # morte com/sem Amuleto, perda de itens, morte na hunt offline
cd server && npx tsx scripts/social.ts   # party e divisão de XP, PvP, revide, bloqueio de viagem/praça, Senkaimon, voltar à cidade
cd server && npx tsx scripts/partner.ts 120000 # bot na praça que aceita convites (para testar a party à mão)
cd server && npx tsx scripts/outfit.ts 60000  # 3 bots na praça com haori/máscara por 60 s; confere o campo look
```

## Limitações conhecidas (protótipo)
- Sem e-mail, recuperação de senha nem troca de senha. Sem HTTPS/WSS: em produção o WebSocket precisa ir atrás de TLS, senão a senha trafega aberta.
- Ingressos e limite de tentativas ficam na memória do processo (um servidor só); com vários servidores, mover para Redis.
- Tiles desenhados em código (placeholder); o plano é trocar por pacotes CC0.
- Rukia e Renji usam o mesmo sprite no Bankai, só com tint; os monstros são todos o mesmo Hollow recolorido.
- Itens perdidos na morte somem: ainda não existe corpo/loot no chão para alguém pegar.
- Só haori e máscara mudam o visual; armas, bandana e o resto não aparecem no sprite (cada combinação nova é uma folha inteira a mais, o que não escala; o caminho para muitos itens seria sprites em camadas).
- Parties não sobrevivem a reinício do servidor (ficam na memória). PvP não tem "caveira"/punição por matar sem motivo; o bloqueio só vale para quem ataca.
- Sem mapa em andares, guilds, troca entre jogadores nem joystick no celular.
- Numa queda brusca se perdem até ~10 s de progresso (o intervalo de save).
