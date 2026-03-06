# Build stage: React (Vite)
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files first for better Docker cache
COPY web-translator/package*.json ./
RUN npm ci

# Copy the app and build
COPY web-translator/ ./
RUN npm run build

# Serve stage (HTTPS with self-signed cert)
FROM nginx:alpine AS final
WORKDIR /usr/share/nginx/html
RUN apk add --no-cache openssl
COPY --from=build /app/dist .
COPY deployment/docker/web-translator/nginx.conf /etc/nginx/conf.d/default.conf
COPY deployment/docker/web-translator/entrypoint.sh /entrypoint.sh
# Strip CR (Windows line endings) so Linux can execute the script
RUN tr -d '\r' < /entrypoint.sh > /tmp/entrypoint.sh && mv /tmp/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 3002
ENTRYPOINT ["/entrypoint.sh"]
