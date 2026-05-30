FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./

RUN mkdir -p apps/api apps/web ingest storage compute packages/shared
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY ingest/package.json ingest/
COPY storage/package.json storage/
COPY compute/package.json compute/
COPY packages/shared/package.json packages/shared/

RUN bun install --frozen-lockfile

COPY . .
RUN cd apps/web && bun run build

FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./

RUN mkdir -p apps/api ingest storage compute packages/shared
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/ingest/package.json ingest/
COPY --from=builder /app/storage/package.json storage/
COPY --from=builder /app/compute/package.json compute/
COPY --from=builder /app/packages/shared/package.json packages/shared/

RUN bun install --production

RUN mkdir -p apps/api/data
COPY --from=builder /app/apps/api/src apps/api/src
COPY --from=builder /app/compute compute
COPY --from=builder /app/ingest ingest
COPY --from=builder /app/storage storage
COPY --from=builder /app/packages packages
COPY --from=builder /app/apps/web/dist apps/web/dist

RUN ln -sf ../storage node_modules/@storage \
 && ln -sf ../ingest node_modules/@ingest \
 && ln -sf ../compute node_modules/@compute \
 && ln -sf ../packages/shared node_modules/@shared

VOLUME /app/apps/api/data
EXPOSE 3030
CMD ["bun", "apps/api/src/index.ts"]
