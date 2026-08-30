# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy the rest of the app
COPY . .

# If you have a build step (TypeScript, bundling, etc.), uncomment:
# RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "app/server.js"]