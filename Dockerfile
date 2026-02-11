# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN npm install --frozen-lockfile || npm install

# Copy source code
COPY . .

# Build the application for production
RUN npm run build:prod

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install simple http server for serving static files
RUN npm install -g serve

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 5173

# Serve the production build
CMD ["serve", "-s", "dist", "-l", "5173"]
