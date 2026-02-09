"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const config = require("./config");

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
 * @param {{ sdpContent?: string }} options - Optional. If sdpContent is set, FFmpeg uses SDP for RTP (required for Opus).
 * @returns {{ close: () => void, getDurationSeconds: () => Promise<number|null> }} - close() stops FFmpeg; getDurationSeconds() uses ffprobe after close
 */
function createRtpToFile(rtpPort, outputPath, logger, options = {}) {
  const ffmpegPath = config.ffmpegPath;
  const dir = path.dirname(outputPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    logger?.error({ err, dir }, "Failed to create output directory");
    throw err;
  }

  let args;
  if (options.sdpContent) {
    const sdpPath = path.join(dir, "recording.sdp");
    fs.writeFileSync(sdpPath, options.sdpContent, "utf8");
    args = [
      "-hide_banner",
      "-loglevel",
      "info",
      "-protocol_whitelist",
      "rtp,file,udp",
      "-i",
      sdpPath,
      "-c:a",
      "copy",
      "-flush_packets",
      "1",
      "-y",
      outputPath
    ];
  } else {
    args = [
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
  }

  const ffmpegProcess = spawn(ffmpegPath, args, {
    stdio: ["pipe", "pipe", "pipe"]
  });

  let closed = false;
  let exitCode = null;
  let exitSignal = null;
  let exited = false;
  const exitPromise = new Promise((resolve) => {
    ffmpegProcess.on("exit", () => { exited = true; resolve(); });
    ffmpegProcess.on("error", () => { exited = true; resolve(); });
  });

  ffmpegProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg && !closed) {
      logger?.info({ ffmpeg: msg }, "FFmpeg");
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
      if (closed) return;
      closed = true;
      try {
        // Send 'q\n' to FFmpeg stdin for graceful shutdown (flushes buffers & finalizes container)
        ffmpegProcess.stdin.write('q\n');
        ffmpegProcess.stdin.end();
      } catch (e) {
        /* stdin may already be closed */
      }
      // On Windows, also try SIGINT after a short delay (may trigger graceful shutdown)
      setTimeout(() => {
        try { if (!exited) ffmpegProcess.kill('SIGINT'); } catch (_) { /* ignore */ }
      }, 1000);
      // Fallback: force-kill after 5 seconds if FFmpeg hasn't exited
      const killTimeout = setTimeout(() => {
        try { if (!exited) ffmpegProcess.kill(); } catch (_) { /* ignore */ }
      }, 5000);
      ffmpegProcess.on('exit', () => clearTimeout(killTimeout));
    },
    async waitForExit(timeoutMs = 6000) {
      if (exited) return;
      await Promise.race([exitPromise, new Promise((r) => setTimeout(r, timeoutMs))]);
    },
    async getDurationSeconds() {
      if (!closed) {
        return null;
      }
      const ffprobePath = config.ffprobePath;
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
