"use strict";

const config = {
  port: Number.parseInt(process.env.PORT || "5003", 10),
  rtpHost: process.env.RECORDING_WORKER_HOST || process.env.HOSTNAME || "localhost",
  mediasoupApiUrl: process.env.MEDIASOUP_API_URL || "http://localhost:4000",
  backendApiUrl: process.env.BACKEND_API_URL || "http://localhost:5000",
  recordingWorkerApiKey: process.env.RECORDING_WORKER_API_KEY || "recording-worker-secret",
  recordingsPath: process.env.RECORDINGS_PATH || "./recordings",
  maxConcurrentSessions: Number.parseInt(process.env.MAX_CONCURRENT_SESSIONS || "10", 10)
};

module.exports = config;
