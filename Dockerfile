FROM node:22.23-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY prisma ./prisma

RUN npm ci
RUN npm --prefix frontend ci

COPY . .

# Prisma generate needs a URL at build time; real credentials are provided at runtime.
ENV DATABASE_URL="postgresql://local:local@127.0.0.1:5432/local?schema=public"

RUN npm run build

FROM node:22.23-alpine AS production

RUN apk add --no-cache openssl

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8000
ENV METRICS_PORT=8001

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY docker/entrypoint.sh /usr/src/app/docker/entrypoint.sh

RUN chmod +x /usr/src/app/docker/entrypoint.sh \
  && npm ci --omit=dev \
  && DATABASE_URL="postgresql://local:local@127.0.0.1:5432/local?schema=public" npx prisma generate \
  && npm cache clean --force

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/frontend/dist ./frontend/dist

EXPOSE 8000 8001

ENTRYPOINT ["/usr/src/app/docker/entrypoint.sh"]
