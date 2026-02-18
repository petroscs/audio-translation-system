# Admin Dashboard Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# API URL for browser (build-time; e.g. http://localhost:5000)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
# Listener web app URL for QR codes (e.g. http://localhost:3001)
ARG VITE_LISTENER_BASE_URL=http://localhost:3001
ENV VITE_LISTENER_BASE_URL=$VITE_LISTENER_BASE_URL

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
