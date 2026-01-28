# Admin Dashboard Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY admin-dashboard/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY admin-dashboard/ .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Copy built files
COPY --from=build /app/dist .

# Copy nginx configuration
COPY deployment/docker/admin-dashboard/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
