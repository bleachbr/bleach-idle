# Imagem do jogo: build Vite + Node servindo estáticos e /api (telemetria/multiplayer/leaderboard).
# A porta 2567 permanece a mesma do bleach-idle para o nginx do host continuar valendo.
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
# o jogo carrega sprites e texturas em runtime por /src/assets/...; o vite build não copia
COPY --from=build /app/src/assets ./src/assets
# Músicas do menu e do Hueco Mundo
COPY --from=build /app/arts/music ./arts/music
COPY server ./server
ENV PORT=2567
ENV STATIC_ROOT=/app/dist
ENV ASSETS_ROOT=/app/src/assets
ENV MUSIC_ROOT=/app/arts/music
ENV LOGS_DIR=/app/logs
RUN mkdir -p /app/logs && chown -R node:node /app
USER node
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:2567/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/production_server.js"]
