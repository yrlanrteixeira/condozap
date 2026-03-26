# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (cache layer)
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and Prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (--only=production is deprecated)
RUN npm ci --omit=dev

# Generate Prisma Client for the production runtime
RUN npx prisma generate

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Start server (Railway handles healthcheck and startCommand via railway.toml)
CMD ["node", "dist/server.js"]
