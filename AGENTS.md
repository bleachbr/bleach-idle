# Diretrizes para Agentes de IA (AGENTS.md)

Este documento define padrões de engenharia, arquitetura, boas práticas e regras operacionais para qualquer Agente de IA trabalhando no repositório **Bleach Idle**.

---

## 1. Visão Geral e Princípios Arquiteturais

Bleach Idle é um MMORPG 2D com visão top-down e progressão idle/ativa ambientado no universo de Bleach.

### Pilares Arquiteturais
1. **Servidor Autoritativo (Zero-Trust Client):**
   - O servidor (`server/`) é a autoridade absoluta em estado, combate, inventário, dano, drops, colisão e pathfinding.
   - O cliente (`client/`) é puramente visual: envia intenções (`move`, `target`, `skill`, `use`, `bankai`) e renderiza o estado sincronizado pelo Colyseus.
   - O tick de simulação do servidor é de **100 ms** (`TICK_MS = 100`).

2. **Código Compartilhado (`shared/`):**
   - Fórmulas matemáticas, tipos, listas de itens, monstros, personagens, mapas e balanceamento residem em `shared/`.
   - Cliente e servidor importam o mesmo pacote `shared/`. Qualquer alteração de dados de jogo deve ser feita em `shared/` para garantir consistência.

3. **Mapas Unificados (Tiled `.tmj`):**
   - Os mapas em `client/public/maps/*.tmj` são lidos tanto pelo cliente (renderização) quanto pelo servidor (`parseMap` para matriz de colisão e objetos de lógica: templos, PZ, lojas, portais, arenas e spawns).
   - **Regra de ouro:** Mapas editados no Tiled **NÃO** devem ser sobrescritos por `art/maps/build_maps.py`.

4. **Persistência Confiável:**
   - SQLite via `node:sqlite` nativo em modo **WAL (Write-Ahead Logging)**.
   - Transação de save automático a cada 10 s, além de saves síncronos ao entrar no mundo, sair, desconectar e morrer.
   - Estado de caçada offline (Auto Hunt / Auto Treino) perdura por até 12 horas e sobrevive a reinício do servidor.

---

## 2. Estrutura do Repositório

```
bleach-idle/
├── AGENTS.md                  # Este guia canônico para agentes
├── README.md                  # Apresentação do jogo e documentação geral
├── DEPLOY.md                  # Infraestrutura de deploy (Docker, Caddy HTTPS, backups)
├── CLAUDE.md                  # Importa este arquivo e acrescenta notas do Claude Code
├── .claude/skills/            # Skills do projeto (índice na seção 7); .kiro/skills/ aponta para elas
├── .claude/settings.json      # Permissões compartilhadas do Claude Code
├── .gitleaks.toml             # Configuração da varredura de segredos
├── vitest.config.ts           # Configuração de testes automatizados Vitest
├── docs/                      # Documentação técnica e de produto
│   ├── roadmap.md             # Visão de futuro, marcos e próximas features
│   ├── aprendizados.md        # Lições técnicas aprendidas no projeto
│   ├── baseline.md            # Linha de base medida de qualidade e desempenho
│   └── pendencias.md          # Débitos técnicos e pendências registradas
├── shared/                    # Tipos, fórmulas, itens, monstros, evolução, mapas
│   ├── src/                   # data.ts, formulas.ts, items.ts, map.ts, evolution.ts, etc.
│   └── test/                  # Testes unitários de shared (formulas, items, social, map)
├── server/                    # Servidor Colyseus + SQLite
│   ├── src/                   # WorldRoom.ts, LobbyRoom.ts, db.ts, http.ts, schema.ts
│   ├── scripts/               # Scripts de cenários de teste, balanceamento e bots
│   └── test/                  # Testes unitários e E2E rápidos (Vitest)
├── client/                    # Cliente Phaser 3 + Vite + PWA
│   ├── src/                   # GameScene.ts, main.ts, sfx.ts, theme.css
│   └── public/                # Assets gráficos, áudios e mapas (.tmj)
└── art/                       # Scripts Python de geração/processamento de arte (Codex)
```

---

## 3. Comandos e Ciclo de Desenvolvimento

Toda intervenção de código deve ser validada com os comandos padrão do projeto:

| Ação | Comando | Descrição |
| :--- | :--- | :--- |
| **Instalação** | `npm install` | Instala dependências nos workspaces |
| **Checagem de Tipos** | `npm run typecheck` | Executa `tsc --noEmit` no server e no client |
| **Testes Unitários / E2E** | `npm test` | Suíte rápida Vitest (testes de regras, banco em memória e E2E) |
| **Modo Watch de Testes** | `npm run test:watch` | Execução interativa contínua do Vitest |
| **Bateria de Cenários** | `npm run test:scripts` | Sobe servidor de teste isolado e roda todos os 31 cenários (cerca de 7 min). Para um só: `cd server && npx tsx scripts/test.ts social` |
| **Segredos** | `gitleaks git --redact -c .gitleaks.toml .` | Varre o histórico. Rode antes de abrir PR |
| **Servidor Dev** | `npm run dev` | Inicia servidor (`localhost:2567`) e Vite (`localhost:5173`) |
| **Build de Produção** | `npm run build` | Compila o bundle estático do cliente para `client/dist` |

---

## 4. Regras Operacionais para Agentes de IA

Ao implementar código ou refatorar no Bleach Idle, o agente deve obrigatoriamente seguir:

### 4.1. Preservação de Comentários e Contexto
- **Nunca** remova comentários explicativos, fórmulas documentadas ou notas de lore sem justificativa explícita.
- Mantenha a convenção de código enxuta e expressiva do projeto.

### 4.2. Segurança e Autoridade do Servidor
- **Nunca** confie em parâmetros enviados pelo cliente (ex.: dano, itens obtidos, velocidade).
- Toda validação de distância (`chebyshev`), tempo de recarga (`cooldown`), custo de reiatsu e elegibilidade de nível deve ser feita no servidor (`WorldRoom.ts`).
- Sanitizar inputs de chat, nomes de personagens e operações no mercado.
- **Nunca** use uma chave vinda do cliente para indexar objeto comum (`CHARS[m.charId]`): `constructor` e `__proto__` passam. Valide com `Object.hasOwn`.
- Mensagens novas entram por `this.handle` (aplica o limite de 40 mensagens por segundo), nunca por `this.onMessage`.
- Rotas de debug e modo Dev nascem desligadas e só ligam com variável explícita. O contrário está registrado em `docs/pendencias.md` (S1).
- Detalhes e checklist: skill `seguranca-servidor`.

### 4.3. Testes Determinísticos e Estabilidade de CI
- Ao criar testes assíncronos ou E2E (especialmente com Colyseus e WebSocket):
  - **Evite** `setTimeout` ou delays arbitrários (como `sleep(300ms)`). Eles causam testes instáveis (*flaky*) no CI do GitHub Actions.
  - **Prefira** esperar por eventos (`onMessage`), mudanças de estado observadas pelo Colyseus Schema ou funções auxiliares de espera com timeout seguro.
  - Bots de teste criados em cenários devem ter nível e atributos compatíveis com os monstros enfrentados.
  - **Não dependa do relógio.** O XP vale em dobro aos sábados e domingos (Brasília); calcule o esperado com `xpWeekend(Date.now())`.
  - Detalhes: skill `testes-deterministicos`.

### 4.4. Gestão de Assets e Sprites
- Spritesheets podem ter 4 ou 8 colunas de caminhada (`cols: 4` ou `cols: 8`). O cálculo de frames e proporções deve respeitar `spriteCols()` e `SPRITES[key]`.
- Ao criar variações de sprite ou modos visuais (Modo HD vs Pixel Art), certifique-se de manter as dimensões relativas para evitar distorção ou encolhimento de escala.

### 4.5. Git e Branches
- Branches de funcionalidade seguem o prefixo `feat/`, correções `fix/`, testes `test/` e documentação `docs/`.
- Sempre execute `npm run typecheck` e `npm test` antes de considerar uma tarefa concluída. Se mexeu em lógica do servidor, rode também os cenários afetados (`npm run test:scripts`).
- Um resultado por PR e um assunto por commit. Mensagens em português, no estilo `tipo: o que mudou`. Código escrito com IA leva `Co-Authored-By` com o modelo usado.
- Quem escreveu não aprova o próprio PR (skill `revisar-pr`). O merge na `main` é decisão de uma pessoa; agente não faz push nem merge sem pedido explícito.

---

## 5. Diretrizes para Documentação (`docs/`)

- Documentos técnicos devem ser mantidos em `docs/` em Português (pt-BR), de acordo com a convenção do projeto.
- Cada nova funcionalidade de grande porte deve ter:
  1. Atualização correspondente no `docs/roadmap.md`.
  2. Testes automatizados cobrindo seus caminhos críticos.
  3. Registro em `docs/aprendizados.md` caso introduza um novo padrão de design ou solucione um problema complexo.
  4. Registro em `docs/pendencias.md` para qualquer débito ou item deixado para etapas posteriores.

---

## 6. Disciplina de trabalho com IA

O projeto cresce com código escrito por pessoas e por agentes. Estas regras mantêm o controle.

1. **Combine o resultado antes de editar.** Diga o que vai mudar e como vai verificar. Se o pedido é ambíguo, pergunte.
2. **Menor mudança que resolve.** Sem refatoração de carona nem recurso que ninguém pediu.
3. **Duas tentativas, depois pare.** Se um conserto falhou duas vezes, relate o que tentou e espere direção.
4. **Hipóteses antes de investigar.** Liste as causas possíveis, descarte cada uma com evidência (`arquivo:linha` ou trecho de log) e só diga "causa raiz" com a prova na mão.
5. **Relate só o que rodou.** Diga quais verificações executou, o resultado e o que ficou sem rodar. Teste que não foi executado não "passa".
6. **Conserto de passagem vai em commit separado.** Teste quebrado ou erro achado no caminho é corrigido, mas fora do commit da tarefa.
7. **Pare e pergunte** quando a mudança: apagar dados, `.sqlite` ou backups; reescrever histórico; mexer em permissão ou segredo; subir major de dependência (por exemplo Colyseus); regenerar mapas editados no Tiled; ou publicar algo (push, PR, deploy).
8. **Segredos nunca entram** em código, log, commit, mensagem de PR ou resposta. Não abra `.env` nem arquivos `.sqlite`.

## 7. Skills do projeto

Ficam em `.claude/skills/` (o Claude Code lê direto; `.kiro/skills/` tem links para o Kiro). Carregue a que combina com a tarefa.

| Skill | Use quando |
| :--- | :--- |
| `seguranca-servidor` | criar ou revisar handler de mensagem, login, sessão, modo Dev, `innerHTML`, dependências ou segredos |
| `testes-deterministicos` | escrever teste, corrigir bug com regressão, investigar CI vermelho ou instável |
| `adicionar-conteudo` | criar personagem, monstro, item, mapa ou missão |
| `revisar-pr` | revisar PR (de pessoa ou de IA) antes do merge |
| `performance-servidor` | mexer no tick, pathfinding, saves, ranking, schema, broadcast, bundle ou assets |

Para criar uma skill nova: pasta com o nome em minúsculas e hífens, `SKILL.md` com `name` igual ao da pasta e `description` de até 1.024 caracteres dizendo quando usar. Registre-a nesta tabela e crie o link em `.kiro/skills/`: `ln -s ../../.claude/skills/NOME .kiro/skills/NOME`. Escreva só o que foi conferido neste repositório.
