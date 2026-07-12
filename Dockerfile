FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/cli/package.json apps/cli/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/agent-runtime/package.json packages/agent-runtime/package.json
COPY packages/change-model/package.json packages/change-model/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/git-provider/package.json packages/git-provider/package.json
COPY packages/github-provider/package.json packages/github-provider/package.json
COPY packages/markdown-core/package.json packages/markdown-core/package.json
RUN npm ci
COPY . .
RUN npm run check && npm prune --omit=dev

FROM node:20-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4100 AGENTDOCS_DATA_DIR=/app/data AGENTDOCS_ALLOWED_REPOSITORY_ROOTS=/repositories
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/data /repositories && chown -R node:node /app/data /repositories
USER node
EXPOSE 4100
CMD ["node", "apps/api/dist/server.js"]
