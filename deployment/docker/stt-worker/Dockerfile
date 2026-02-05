# STT Worker Dockerfile
# Use Debian slim - Python includes venv stdlib (no Alpine py3-venv issues)
FROM node:20-bookworm-slim AS base
WORKDIR /app

# Install FFmpeg and Python (for Whisper)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Whisper in a virtual environment (PEP 668)
RUN python3 -m venv /opt/whisper-venv && \
    /opt/whisper-venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/whisper-venv/bin/pip install --no-cache-dir openai-whisper

ENV PATH="/opt/whisper-venv/bin:${PATH}"

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
COPY --from=build /app/package*.json ./

# Expose STT worker API port
EXPOSE 5002

# Set environment variables
ENV NODE_ENV=production

CMD ["node", "src/index.js"]
