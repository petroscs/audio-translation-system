# STT Worker Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

# Install FFmpeg and Python (for Whisper)
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++

# Install Whisper (using openai-whisper)
RUN pip3 install --no-cache-dir openai-whisper

FROM base AS build
WORKDIR /app

# Copy package files
COPY stt-worker/package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY stt-worker/ .

FROM base AS final
WORKDIR /app

# Copy dependencies and source
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/config ./config
COPY --from=build /app/package*.json ./

# Expose STT worker API port
EXPOSE 5002

# Set environment variables
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
