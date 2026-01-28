# mediasoup Service Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies for mediasoup
RUN apk add --no-cache \
    python3 \
    make \
    g++

FROM base AS build
WORKDIR /app

# Copy package files
COPY mediasoup-service/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY mediasoup-service/ .

FROM base AS final
WORKDIR /app

# Copy dependencies and source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/config ./config
COPY --from=build /app/package*.json ./

# Expose mediasoup ports
EXPOSE 4000
EXPOSE 10000-10100/udp

# Set environment variables
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
