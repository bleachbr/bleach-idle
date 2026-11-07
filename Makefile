.PHONY: help install dev build preview clean docker-build docker-run

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

docker-run: ## Executa o container Docker na porta 5173
	docker run -p 5173:5173 bleach-soul-survivor:latest
