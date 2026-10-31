---
name: revisar-pr
description: Revisa um pull request do Bleach Idle de ponta a ponta e devolve um relatório com severidade e arquivo:linha, sem publicar nada no GitHub sem o aval do dono. Use quando pedirem para revisar PR, conferir antes do merge ou validar trabalho feito por IA.
---

# Revisão de PR

Quem escreveu (pessoa ou IA) não aprova o próprio PR. Esta skill é o segundo par de olhos. Por padrão ela só lê e relata no terminal; publicar com `gh pr review` exige o aval explícito do dono do repositório.

## 1. Contexto
`gh pr view N --json title,body,headRefName,files,statusCheckRollup`, `gh pr diff N`, `gh pr checks N`.
- CI vermelho: ache a causa antes de opinar (`gh run view ID --log-failed`) e compare com a `main`. Não aprove com CI vermelho, e não culpe o PR sem evidência (já aconteceu: PR só de documentação ficou vermelho por um cenário que depende do dia da semana).
- Rode `git status` e leia as seções 1 e 4 do AGENTS.md.

## 2. Portão de segurança (sempre primeiro)
Se o diff toca `this.handle`, login ou sessão, `innerHTML`, dependências, Dockerfile, CI ou segredos: aplique a skill `seguranca-servidor` e rode `gitleaks git --redact -c .gitleaks.toml .`. Achado que BLOQUEIA encerra a revisão com esse veredito.

## 3. Camadas (para cada uma: ENCONTRADO ou LIMPO)
1. **Autoridade.** O servidor decide dano, drop, preço, distância e cooldown? O cliente só manda intenção?
2. **`shared/`.** Dado de jogo novo fica em `shared/` e os dois lados importam o mesmo? Os catálogos fecham (`npx tsx .claude/skills/adicionar-conteudo/scripts/verificar-catalogo.mts`)?
3. **Save.** Campo novo em `SaveData` tem padrão em `fromSave` (`saved.x ?? padrão`)? Save antigo continua carregando? Migração de tabela é aditiva (`ALTER TABLE ... ADD COLUMN`)?
4. **Schema do Colyseus.** Campo sincronizado vai para todos os clientes (não há filtro), e tipo errado derruba a sala. Precisa ser tempo real, ou um `send` pontual basta?
5. **Testes.** Cobrem o caminho crítico e a entrada inválida? Sem `sleep` fixo e sem depender do relógio (skill `testes-deterministicos`)? O teste de bug falha sem a correção?
6. **Desempenho.** Laço novo no tick, I/O síncrono, `broadcast` novo, busca de caminho sem limite (skill `performance-servidor`).
7. **Falhas silenciosas.** `catch` que engole o erro (mau exemplo existente: `db.createAccount` trata qualquer exceção como "login já existe"), retorno que esconde o motivo, promessa sem `await` ou `catch`.
8. **Tipos.** `any` novo precisa de motivo. Dado externo (`JSON.parse`, mensagem do cliente) é validado antes de virar tipo.
9. **Mapas.** O `.tmj` editado no Tiled não foi regenerado por `build_maps.py`, e `mapcheck.ts` passa.
10. **Docs e comentários.** `roadmap`, `aprendizados` e `pendencias` atualizados (AGENTS.md §5); comentários e notas de lore preservados (§4.1); nenhuma função, arquivo ou constante citada que não exista (confira com `grep`).
11. **Escopo.** Um resultado por PR, sem refatoração de carona. O `WorldRoom.ts` já passa de 2.500 linhas: código novo vai para um `registerXMessages` próprio ou para um módulo novo.

## 4. Relatório
Veredito no topo: BLOQUEIA, APROVA COM RESSALVAS ou APROVA. Depois os achados, do mais grave ao menos grave:

`[SEVERIDADE] categoria, arquivo:linha, risco em uma frase, correção`

Termine com o que foi executado (comando e resultado) e o que não foi. Não escreva "os testes passam" sem ter rodado.
