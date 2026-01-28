# Recording Worker Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install FFmpeg
RUN apk add --no-cache ffmpeg

FROM base AS build
WORKDIR /app

# Copy package files
COPY recording-worker/package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY recording-worker/ .

FROM base AS final
WORKDIR /app

# Copy dependencies and source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/config ./config
COPY --from=build /app/package*.json ./

# Create recordings directory
RUN mkdir -p /recordings

# Expose recording worker API port
EXPOSE 5003

# Set environment variables
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
