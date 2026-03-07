# Stage 1: Build frontend
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npx tsc -b && npx vite build

# Stage 2: Production runtime
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY server/ ./server/
COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/proxy.js"]
