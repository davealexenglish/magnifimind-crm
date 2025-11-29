# Multi-stage Dockerfile for React frontend
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies and optional dependencies needed for build)
# Use clean install to ensure optional dependencies are properly installed
RUN npm ci --include=optional || npm install --include=optional

# Explicitly install rollup platform-specific binary for Alpine Linux
RUN npm install --no-save @rollup/rollup-linux-x64-musl

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Runtime with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
