# Multi-stage production Dockerfile for MyCloud Cinema
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_DIR=/data/storage

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/public ./public

# Persistent storage volume mount
VOLUME ["/data/storage"]

EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
