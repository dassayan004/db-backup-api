# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Install PostgreSQL, MongoDB, MariaDB, MSSQL (freetds), and Bash
RUN apk add --no-cache \
    postgresql-client \
    mongodb-tools \
    mariadb-client \
    freetds \
    bash

ENV NODE_ENV=production

EXPOSE 8000

CMD ["node", "dist/main"]
