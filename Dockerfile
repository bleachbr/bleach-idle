# Imagem do jogo: um processo Node serve o cliente pronto, o WebSocket e o /healthz na porta 2567.
# O banco e os backups ficam em /data (volume). Veja DEPLOY.md.
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
COPY shared/package.json shared/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm -w client run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=2567 DB_FILE=/data/bleach-idle.sqlite BACKUP_DIR=/data/backups
# o tsx procura o tsconfig a partir do cwd (/app) subindo, e não acha o do servidor: sem ele,
# useDefineForClassFields vira true, os campos de classe escondem os acessores do schema e o
# Colyseus manda o estado vazio. Caminho absoluto: vale para qualquer cwd dentro do container
ENV TSX_TSCONFIG_PATH=/app/server/tsconfig.json
COPY --chown=node:node --from=build /app/package.json /app/package-lock.json ./
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/shared ./shared
COPY --chown=node:node --from=build /app/server ./server
COPY --chown=node:node --from=build /app/client/package.json ./client/package.json
COPY --chown=node:node --from=build /app/client/dist ./client/dist
COPY --chown=node:node --from=build /app/client/public/maps ./client/public/maps
RUN mkdir -p /data/backups && chown -R node:node /data && chown node:node /app
VOLUME /data
USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:2567/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--import", "tsx", "server/src/index.ts"]
