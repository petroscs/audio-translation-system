# Web Listener Dockerfile
FROM node:20-alpine AS build
WORKDIR /app

# API URL for browser (build-time; e.g. http://localhost:5000)
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

# Copy package files
COPY web-listener/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY web-listener/ .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html

# Copy built files
COPY --from=build /app/dist .

# Copy nginx configuration
COPY deployment/docker/web-listener/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]
