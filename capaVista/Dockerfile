# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS dependencies
WORKDIR /app/capaVista
COPY capaVista/package*.json ./
RUN npm ci

FROM dependencies AS development
COPY --chown=node:node capaVista/ ./
COPY --chown=node:node shared /app/shared
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

FROM dependencies AS build
ARG APP_VERSION=development
COPY capaVista/ ./
COPY shared /app/shared
RUN npm run build && node -e "require('fs').writeFileSync('dist/version.json',JSON.stringify({version:process.argv[1]}))" "$APP_VERSION"

FROM nginxinc/nginx-unprivileged:stable-alpine AS production
ARG APP_VERSION=development
LABEL org.opencontainers.image.source="https://github.com/Grupo10ingsoftware/itecsa-app"
LABEL org.opencontainers.image.revision=$APP_VERSION
USER root
RUN apk add --no-cache jq
COPY --from=build /app/capaVista/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 deploy/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/version.json || exit 1
