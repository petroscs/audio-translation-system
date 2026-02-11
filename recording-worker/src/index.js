"use strict";

const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const { getRouterCapabilities, setupMediasoupConsumer } = require("./mediasoup-consumer");
const { createRtpToFile, getNextRtpPort } = require("./rtp-to-file");
const { sendRecordingComplete } = require("./recording-sender");
const { buildSdpForReceiving } = require("./sdp-helper");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined
});

const activePipelines = new Map();
const { spawn } = require("child_process");

function getSessionDir(sessionId) {
  const recordingsPath = path.resolve(config.recordingsPath);
  return path.join(recordingsPath, String(sessionId));
}

function getAggregatePath(sessionId) {
  return path.join(getSessionDir(sessionId), "recording.opus");
}

function getRelativeAggregatePath(sessionId) {
  return path.join(String(sessionId), "recording.opus");
}

function getSegmentPath(sessionId) {
  const dir = path.join(getSessionDir(sessionId), "segments");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `segment-${Date.now()}-${Math.floor(Math.random() * 100000)}.opus`);
}

function escapeForConcatList(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

async function probeDurationSeconds(filePath) {
  const ffprobePath = config.ffprobePath;
  return new Promise((resolve) => {
    const probe = spawn(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let out = "";
    probe.stdout.on("data", (d) => {
      out += d.toString();
    });
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

async function mergeSegmentIntoAggregate(sessionId, segmentPath) {
  const sessionDir = getSessionDir(sessionId);
  const aggregatePath = getAggregatePath(sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  if (!fs.existsSync(aggregatePath)) {
    fs.renameSync(segmentPath, aggregatePath);
    return aggregatePath;
  }

  const concatListPath = path.join(sessionDir, `concat-${Date.now()}.txt`);
  const mergedTempPath = path.join(sessionDir, `recording-merged-${Date.now()}.opus`);

  fs.writeFileSync(
    concatListPath,
    `file '${escapeForConcatList(aggregatePath)}'\nfile '${escapeForConcatList(segmentPath)}'\n`,
    "utf8"
  );

  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(
        config.ffmpegPath,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-f",
          "concat",
          "-safe",
          "0",
          "-i",
          concatListPath,
          "-c",
          "copy",
          "-y",
          mergedTempPath
        ],
        { stdio: ["ignore", "pipe", "pipe"] }
      );
      let stderr = "";
      proc.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      proc.on("error", reject);
      proc.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `ffmpeg concat failed with code ${code}`));
      });
    });

    fs.unlinkSync(aggregatePath);
    fs.renameSync(mergedTempPath, aggregatePath);
    fs.unlinkSync(segmentPath);
  } finally {
    try {
      if (fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
    } catch (_) {}
    try {
      if (fs.existsSync(mergedTempPath)) fs.unlinkSync(mergedTempPath);
    } catch (_) {}
  }

  return aggregatePath;
}

async function startPipeline(sessionId, eventId, channelId, producerId, mediasoupProducerId) {
  if (activePipelines.has(sessionId)) {
    logger.warn({ sessionId }, "Recording pipeline already active");
    return;
  }

  if (activePipelines.size >= config.maxConcurrentSessions) {
    throw new Error("Max concurrent sessions reached");
  }

  const rtpPort = getNextRtpPort();
  const segmentPath = getSegmentPath(sessionId);
  const aggregatePath = getAggregatePath(sessionId);

  let rtpToFile = null;
  try {
    const { rtpParameters } = await setupMediasoupConsumer(
      sessionId,
      eventId,
      channelId,
      mediasoupProducerId,
      config.rtpHost,
      rtpPort,
      logger
    );

    const audioCodec = rtpParameters?.codecs?.find((c) => c.mimeType?.toLowerCase().startsWith("audio/"));
    logger.info(
      {
        rtpPort,
        payloadType: audioCodec?.payloadType,
        mimeType: audioCodec?.mimeType,
        clockRate: audioCodec?.clockRate
      },
      "Consumer created, building SDP from consumer rtpParameters"
    );

    const sdpContent = buildSdpForReceiving(rtpPort, rtpParameters);
    logger.info(
      { rtpPort, sdpPreview: sdpContent.split("\r\n").slice(0, 7).join(" | ") },
      "Starting FFmpeg with SDP matching consumer payload type"
    );
    rtpToFile = createRtpToFile(rtpPort, segmentPath, logger, { sdpContent });
  } catch (err) {
    if (rtpToFile) rtpToFile.close();
    throw err;
  }

  activePipelines.set(sessionId, {
    rtpToFile,
    sessionId,
    segmentPath,
    aggregatePath,
    relativePath: getRelativeAggregatePath(sessionId)
  });

  logger.info({ sessionId, rtpPort, segmentPath, aggregatePath }, "Recording pipeline started");
}

async function stopPipeline(sessionId) {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) {
    logger.warn({ sessionId }, "No recording pipeline found for session");
    return;
  }

  pipeline.rtpToFile.close();
  // Wait for FFmpeg to gracefully exit (flush buffers & finalize container)
  await pipeline.rtpToFile.waitForExit(6000);
  activePipelines.delete(sessionId);

  const relativePath = pipeline.relativePath;
  const segmentPath = pipeline.segmentPath;
  const aggregatePath = pipeline.aggregatePath;

  let durationSeconds = 0;
  try {
    const d = await pipeline.rtpToFile.getDurationSeconds();
    durationSeconds = d != null ? d : 0;
  } catch (e) {
    logger.warn({ err: e, sessionId }, "Could not get duration");
  }

  const segmentExists = fs.existsSync(segmentPath);
  const segmentStat = segmentExists ? fs.statSync(segmentPath) : null;
  const hasSegmentContent = segmentStat && segmentStat.size > 0;

  let finalDuration = 0;
  if (hasSegmentContent) {
    await mergeSegmentIntoAggregate(sessionId, segmentPath);
  } else if (segmentExists) {
    try {
      fs.unlinkSync(segmentPath);
    } catch (_) {}
  }

  const aggregateExists = fs.existsSync(aggregatePath);
  const aggregateStat = aggregateExists ? fs.statSync(aggregatePath) : null;
  const hasAggregateContent = aggregateStat && aggregateStat.size > 0;
  if (hasAggregateContent) {
    finalDuration = await probeDurationSeconds(aggregatePath);
  } else {
    finalDuration = 0;
  }

  logger.info(
    {
      sessionId,
      segmentExists,
      segmentSize: segmentStat?.size ?? 0,
      aggregateExists,
      aggregateSize: aggregateStat?.size ?? 0,
      segmentDurationSeconds: durationSeconds ?? 0,
      durationSeconds: finalDuration
    },
    "Recording stop: file check"
  );

  try {
    await sendRecordingComplete(sessionId, relativePath, finalDuration);
    logger.info(
      { sessionId, relativePath, durationSeconds: finalDuration, hadContent: hasAggregateContent },
      "Recording complete sent to backend"
    );
  } catch (err) {
    logger.error({ err, sessionId }, "Failed to send recording complete to backend");
  }

  if (!aggregateExists || !hasAggregateContent) {
    logger.warn(
      { sessionId, aggregateExists, hasAggregateContent },
      "Recording had no audio data; backend notified with duration 0"
    );
  }

  logger.info({ sessionId }, "Recording pipeline stopped");
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(
    pinoHttp({
      logger,
      autoLogging: true
    })
  );

  app.post("/recording/start", async (req, res) => {
    try {
      const { sessionId, eventId, channelId, producerId, mediasoupProducerId } = req.body || {};

      if (!sessionId || !mediasoupProducerId) {
        res.status(400).json({
          error: "sessionId and mediasoupProducerId are required."
        });
        return;
      }

      if (!eventId || !channelId) {
        res.status(400).json({
          error: "eventId and channelId are required so the recording uses the same mediasoup router as the producer."
        });
        return;
      }

      await startPipeline(
        sessionId,
        eventId,
        channelId,
        producerId,
        mediasoupProducerId
      );

      res.status(202).json({ accepted: true });
    } catch (err) {
      logger.error({ err }, "Failed to start recording pipeline");
      res.status(500).json({ error: err.message || "Internal error" });
    }
  });

  app.post("/recording/stop", async (req, res) => {
    try {
      const { sessionId } = req.body || {};

      if (!sessionId) {
        res.status(400).json({ error: "sessionId is required." });
        return;
      }

      await stopPipeline(sessionId);
      res.status(200).json({ stopped: true });
    } catch (err) {
      logger.error({ err }, "Failed to stop recording pipeline");
      res.status(500).json({ error: err.message || "Internal error" });
    }
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      activeSessions: activePipelines.size,
      maxSessions: config.maxConcurrentSessions
    });
  });

  return app;
}

function validateFfmpeg(ffmpegPath, logger) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(ffmpegPath, ["-version"], {
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 5000
      });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (d) => { stdout += d.toString(); });
      proc.stderr.on("data", (d) => { stderr += d.toString(); });
      proc.on("error", (err) => {
        logger.error({ err, ffmpegPath }, "FFmpeg validation failed - cannot execute");
        resolve(false);
      });
      proc.on("exit", (code) => {
        if (code === 0 || stdout.includes("ffmpeg version") || stderr.includes("ffmpeg version")) {
          logger.info({ ffmpegPath, version: (stdout || stderr).split("\n")[0] }, "FFmpeg validated");
          resolve(true);
        } else {
          logger.error({ code, ffmpegPath }, "FFmpeg validation failed - exit code");
          resolve(false);
        }
      });
    } catch (err) {
      logger.error({ err, ffmpegPath }, "FFmpeg validation failed - spawn error");
      resolve(false);
    }
  });
}

const app = createApp();
app.listen(config.port, "0.0.0.0", async () => {
  logger.info({ port: config.port }, "Recording worker listening");
  const isValid = await validateFfmpeg(config.ffmpegPath, logger);
  if (!isValid) {
    logger.error(
      { ffmpegPath: config.ffmpegPath },
      "FFmpeg not working. Set FFMPEG_PATH to the full path to ffmpeg.exe. Find it with: Get-ChildItem -Path $env:LOCALAPPDATA -Filter ffmpeg.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"
    );
  }
});
