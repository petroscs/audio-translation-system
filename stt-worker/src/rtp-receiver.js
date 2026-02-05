"use strict";

const { spawn } = require("child_process");

const RTP_PORT_START = 5010;
const RTP_PORT_END = 5020;
let nextPort = RTP_PORT_START;

function getNextRtpPort() {
  const port = nextPort;
  nextPort = nextPort >= RTP_PORT_END ? RTP_PORT_START : nextPort + 1;
  return port;
}

function createRtpReceiver(rtpPort, onPcmChunk, logger) {
  const ffmpegPath = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "rtp",
    "-i",
    `rtp://0.0.0.0:${rtpPort}`,
    "-f",
    "s16le",
    "-ar",
    "16000",
    "-ac",
    "1",
    "pipe:1"
  ];

  const ffmpegProcess = spawn(ffmpegPath, args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let closed = false;

  ffmpegProcess.stdout.on("data", (chunk) => {
    if (!closed && onPcmChunk) {
      onPcmChunk(chunk);
    }
  });

  ffmpegProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg && !closed) {
      logger?.warn({ ffmpeg: msg }, "FFmpeg stderr");
    }
  });

  ffmpegProcess.on("error", (err) => {
    if (!closed) {
      logger?.error({ err }, "FFmpeg process error");
    }
  });

  ffmpegProcess.on("exit", (code, signal) => {
    if (!closed) {
      logger?.info({ code, signal }, "FFmpeg process exited");
    }
  });

  logger?.info({ port: rtpPort }, "RTP receiver started");

  return {
    close() {
      closed = true;
      try {
        ffmpegProcess.kill("SIGTERM");
      } catch (e) {
        /* ignore */
      }
    }
  };
}

module.exports = { createRtpReceiver, getNextRtpPort };
