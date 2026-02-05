"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const RTP_PORT_START = 5020;
const RTP_PORT_END = 5030;
let nextPort = RTP_PORT_START;

function getNextRtpPort() {
  const port = nextPort;
  nextPort = nextPort >= RTP_PORT_END ? RTP_PORT_START : nextPort + 1;
  return port;
}

/**
 * Create FFmpeg process that receives RTP and writes to an audio file (Opus).
 * @param {number} rtpPort - Port to listen for RTP
 * @param {string} outputPath - Full path to output file (e.g. /recordings/sessionId/recording.opus)
 * @param {object} logger - Pino logger
 * @returns {{ close: () => void, getDurationSeconds: () => Promise<number|null> }} - close() stops FFmpeg; getDurationSeconds() uses ffprobe after close
 */
function createRtpToFile(rtpPort, outputPath, logger) {
  const ffmpegPath = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const dir = path.dirname(outputPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    logger?.error({ err, dir }, "Failed to create output directory");
    throw err;
  }

  const args = [
    "-hide_banner",
    "-loglevel",
    "warning",
    "-f",
    "rtp",
    "-i",
    `rtp://0.0.0.0:${rtpPort}`,
    "-c:a",
    "libopus",
    "-b:a",
    "64k",
    "-vbr",
    "on",
    "-y",
    outputPath
  ];

  const ffmpegProcess = spawn(ffmpegPath, args, {
    stdio: ["ignore", "pipe", "pipe"]
  });

  let closed = false;
  let exitCode = null;
  let exitSignal = null;

  ffmpegProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg && !closed) {
      logger?.debug({ ffmpeg: msg }, "FFmpeg stderr");
    }
  });

  ffmpegProcess.on("error", (err) => {
    if (!closed) {
      logger?.error({ err }, "FFmpeg process error");
    }
  });

  ffmpegProcess.on("exit", (code, signal) => {
    exitCode = code;
    exitSignal = signal;
    if (!closed) {
      logger?.info({ code, signal, outputPath }, "FFmpeg process exited");
    }
  });

  logger?.info({ port: rtpPort, outputPath }, "RTP to file started");

  return {
    outputPath,
    close() {
      closed = true;
      try {
        ffmpegProcess.kill("SIGTERM");
      } catch (e) {
        /* ignore */
      }
    },
    async getDurationSeconds() {
      if (!closed) {
        return null;
      }
      const ffprobePath = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
      return new Promise((resolve) => {
        const probe = spawn(ffprobePath, [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          outputPath
        ], { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        probe.stdout.on("data", (d) => { out += d.toString(); });
        probe.on("error", () => resolve(0));
        probe.on("exit", (code) => {
          if (code !== 0) {
            resolve(0);
            return;
          }
          const duration = parseFloat(out.trim(), 10);
          resolve(Number.isFinite(duration) ? Math.round(duration) : 0);
        });
      });
    }
  };
}

module.exports = { createRtpToFile, getNextRtpPort };
