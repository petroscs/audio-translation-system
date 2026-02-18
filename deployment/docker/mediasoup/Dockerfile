# mediasoup Service Dockerfile
# mediasoup@3.19+ requires Node >= 22
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies for mediasoup (worker build from source when prebuilt fails in Alpine)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++

FROM base AS build
WORKDIR /app

# Copy package files
COPY mediasoup-service/package*.json ./

# Install dependencies
RUN npm ci --omit=dev

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
