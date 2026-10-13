FROM node:22-bookworm-slim

WORKDIR /app
ENV HUSKY=0
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node . .
RUN chown node:node /app
USER node

RUN npm ci \
  && npm run db:generate \
  && npm run build

ENV NODE_ENV=production
EXPOSE 3000 3333
