.PHONY: help install dev build preview clean docker-build docker-run test

help: ## Exibe a lista de comandos disponíveis
	@echo "=================================================="
	@echo "    BLEACH: SOUL SURVIVOR - COMANDOS MAKEFILE     "
	@echo "=================================================="
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Instala dependências do projeto (npm install)
	npm install

dev: ## Inicia o servidor de desenvolvimento local com hot-reload (Vite)
	npm run dev

build: ## Compila o projeto otimizado para produção (dist)
	npm run build

preview: ## Visualiza a build de produção localmente
	npm run preview

clean: ## Remove node_modules e diretório dist
	rm -rf node_modules dist .vite

docker-build: ## Constrói a imagem Docker para o jogo
	docker build -t bleach-soul-survivor:latest .

docker-run: ## Executa o container Docker na porta 2567
	docker run -p 2567:2567 bleach-soul-survivor:latest

validate-sprites: ## Executa testes de qualidade estática nos sprites gerados (alturas, baseline, despill)
	python3 geradores/validate_sprites.py --name ichigo_shikai
	python3 geradores/validate_player_kit.py
	python3 geradores/validate_sprites.py --name shrieker --category monsters
	python3 geradores/validate_sprites.py --name acidwire --category monsters
	python3 geradores/validate_hollow_clips.py
	python3 geradores/validate_sprites.py --name ishida
	python3 geradores/validate_sprites.py --name sado
	for c in ishida sado grimmjow; do python3 geradores/validate_player_kit.py --char $$c || exit 1; done

test-sprites-e2e: ## Executa testes visuais E2E em navegador (Playwright 360 e viewport)
	python3 scratch/test_sprite_consistency_e2e.py

docs-sync: ## Recalcula o bloco de progresso do STATUS a partir das caixas do ROADMAP
	python3 scripts/docs/sync_status.py

docs-check: ## Falha se pendência, aprendizado, progresso ou link relativo estiver incoerente
	python3 scripts/docs/docs_check.py

docs-test: ## Testes do checker de governança
	python3 scripts/docs/test_governanca.py

size-check: ## Falha se função ou arquivo JS passar do teto ou se a dívida crescer
	python3 scripts/lint/js_size.py

size-test: ## Testes da catraca de tamanho do JS
	python3 scripts/lint/test_js_size.py

movement-test: ## Testes unitários de movimentação, walk cycle e direções da câmera
	python3 scripts/test_player_movement.py

player-anim-test: ## Testes da máquina de estados de animação do jogador
	python3 scripts/test_player_animation.py

hollow-test: ## Testes de sorteio, rota e ataque dos tipos de hollow
	python3 scripts/test_hollow_types.py
arsenal-test: ## Testes do arsenal de cada personagem jogável
	python3 scripts/test_arsenal.py
	python3 scripts/test_projectile_orientation.py

evolution-test: ## Testes unitários de ciclo infinito, reiatsu e level-up timer
	python3 scripts/test_endless_evolution.py

safety-test: ## Testes de proteção: Lua ao norte/baixa, transição do prólogo e segurança em runtime
	python3 scripts/test_runtime_safety.py

rpg-stats-test: ## Testes unitários do sistema de atributos RPG, caps matemáticos (CDR 65%, Hierro 75%) e sinergias
	python3 scripts/test_rpg_stats.py

test: movement-test player-anim-test evolution-test safety-test rpg-stats-test docs-test size-test ## Roda os testes unitários do protótipo (movimento, ciclo, proteções, rpg stats, governança, catraca de tamanho)
