# Imagem do jogo: build estático do Vite servido por nginx sem root na porta 2567.
# A porta é a mesma do bleach-idle para o nginx do host (infra/nginx.host.conf) continuar valendo.
# o dist não depende de arquitetura: buildar nativo evita o esbuild quebrar sob qemu (Mac arm64 -> VPS amd64)
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY infra/nginx.container.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# o jogo carrega sprites e texturas em runtime por /src/assets/...; o dev server serve isso, o vite build não copia
COPY --from=build /app/src/assets /usr/share/nginx/html/src/assets
# Músicas do menu e do Hueco Mundo servidas estaticamente
COPY --from=build /app/arts/music /usr/share/nginx/html/arts/music
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:2567/healthz >/dev/null || exit 1
