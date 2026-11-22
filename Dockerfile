# Build client
FROM node:20-alpine AS client-builder
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client .
RUN npm run build

# Server
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/src ./src
COPY server/data ./data
COPY --from=client-builder /build/client/dist ./public

EXPOSE 3001
ENV NODE_ENV=production DATA_DIR=/data
CMD ["node", "src/index.js"]
