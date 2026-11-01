# Makefile — Bleach Idle
.PHONY: help install dev build start typecheck test test-watch test-scripts secrets \
        ia-install ia-typecheck ia-test ia-play ia-play-prod ia-play-30m ia-play-local ia-play-fast ia-clean

help: ## Lista todos os comandos disponíveis
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ---------- Projeto principal ----------

install: ## Instala dependências do servidor, cliente e compartilhado
	npm install

dev: ## Inicia servidor (2567) e cliente Vite (5173) em modo dev
	npm run dev

build: ## Compila o bundle de produção do cliente em client/dist
	npm run build

start: ## Inicia o servidor Colyseus em modo produção
	npm run start

typecheck: ## Checagem de tipos (tsc --noEmit) no server e no client
	npm run typecheck

test: ## Roda a suíte rápida de testes unitários e E2E (Vitest)
	npm test

test-watch: ## Roda o Vitest em modo interativo (watch)
	npm run test:watch

test-scripts: ## Roda a bateria de 31 cenários do servidor (ou CENARIO=social make test-scripts)
	npm run test:scripts $(CENARIO)

secrets: ## Varre o histórico Git em busca de segredos com gitleaks
	gitleaks git --redact -c .gitleaks.toml .

# ---------- Jogador-IA (test/) ----------

ia-install: ## Instala dependências e Chromium da pasta independente test/
	cd test && npm install && npx playwright install chromium

ia-typecheck: ## Checa os tipos do Jogador-IA em test/
	cd test && npm run typecheck

ia-test: ## Roda os testes unitários do Jogador-IA em test/
	cd test && npm test

ia-play: ## 4 instâncias de IA (novato, explorador, grinder, caotico) jogando por 30 min (default)
	cd test && npm run play -- --explorar 30

ia-play-prod: ## 4 instâncias jogando por 30 min em produção (bleach.acoplum.com ou URL=...)
	cd test && npm run play -- --url $(if $(URL),$(URL),https://bleach.acoplum.com) --explorar 30

ia-play-30m: ## 30 min: 15 min explorando + 15 min saindo/voltando e testando novidades da main
	cd test && npm run play -- --explorar 15 --retorno 15

ia-play-local: ## 4 instâncias por 30 min testando o código local (sem usar o worktree da main)
	cd test && npm run play -- --local --explorar 30

ia-play-fast: ## Rodada rápida (3 min) com as 4 instâncias para validação rápida
	cd test && npm run play -- --explorar 3

ia-clean: ## Apaga relatórios, vídeos e banco acumulado das rodadas da IA (mantém o worktree)
	rm -rf test/runs/20* test/runs/jogo.sqlite* test/runs/memoria-*.json test/runs/checkpoint.json
