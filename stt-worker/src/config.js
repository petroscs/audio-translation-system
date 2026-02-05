"use strict";

const config = {
  port: Number.parseInt(process.env.PORT || "5002", 10),
  rtpHost: process.env.STT_WORKER_HOST || process.env.HOSTNAME || "localhost",
  mediasoupApiUrl: process.env.MEDIASOUP_API_URL || "http://localhost:4000",
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:5000",
  sttWorkerApiKey: process.env.STT_WORKER_API_KEY || "stt-worker-secret",
  whisperModel: process.env.WHISPER_MODEL || "base",
  maxConcurrentSessions: Number.parseInt(process.env.MAX_CONCURRENT_SESSIONS || "10", 10)
};

module.exports = config;
