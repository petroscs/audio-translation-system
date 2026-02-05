"use strict";

const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const path = require("path");
const fs = require("fs");
const config = require("./config");
const { setupMediasoupConsumer } = require("./mediasoup-consumer");
const { createRtpToFile, getNextRtpPort } = require("./rtp-to-file");
const { sendRecordingComplete } = require("./recording-sender");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined
});

const activePipelines = new Map();

async function startPipeline(sessionId, channelId, producerId, mediasoupProducerId) {
  if (activePipelines.has(sessionId)) {
    logger.warn({ sessionId }, "Recording pipeline already active");
    return;
  }

  if (activePipelines.size >= config.maxConcurrentSessions) {
    throw new Error("Max concurrent sessions reached");
  }

  const rtpPort = getNextRtpPort();
  const recordingsPath = path.resolve(config.recordingsPath);
  const sessionDir = path.join(recordingsPath, String(sessionId));
  const outputPath = path.join(sessionDir, "recording.opus");

  const rtpToFile = createRtpToFile(rtpPort, outputPath, logger);

  try {
    await setupMediasoupConsumer(
      sessionId,
      mediasoupProducerId,
      config.rtpHost,
      rtpPort,
      logger
    );
  } catch (err) {
    rtpToFile.close();
    throw err;
  }

  activePipelines.set(sessionId, {
    rtpToFile,
    sessionId,
    outputPath,
    relativePath: path.join(String(sessionId), "recording.opus")
  });

  logger.info({ sessionId, rtpPort, outputPath }, "Recording pipeline started");
}

async function stopPipeline(sessionId) {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) {
    logger.warn({ sessionId }, "No recording pipeline found for session");
    return;
  }

  pipeline.rtpToFile.close();
  activePipelines.delete(sessionId);

  const relativePath = pipeline.relativePath;
  const outputPath = pipeline.outputPath;

  await new Promise((r) => setTimeout(r, 500));

  let durationSeconds = 0;
  try {
    const d = await pipeline.rtpToFile.getDurationSeconds();
    durationSeconds = d != null ? d : 0;
  } catch (e) {
    logger.warn({ err: e, sessionId }, "Could not get duration");
  }

  const fileExists = fs.existsSync(outputPath);
  const stat = fileExists ? fs.statSync(outputPath) : null;
  const hasContent = stat && stat.size > 0;

  if (fileExists && hasContent && durationSeconds !== null) {
    try {
      await sendRecordingComplete(sessionId, relativePath, durationSeconds);
      logger.info({ sessionId, relativePath, durationSeconds }, "Recording complete sent to backend");
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to send recording complete to backend");
    }
  } else {
    logger.warn(
      { sessionId, fileExists, hasContent, durationSeconds },
      "Skipping POST complete: no file or zero length"
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
      const { sessionId, channelId, producerId, mediasoupProducerId } = req.body || {};

      if (!sessionId || !mediasoupProducerId) {
        res.status(400).json({
          error: "sessionId and mediasoupProducerId are required."
        });
        return;
      }

      await startPipeline(
        sessionId,
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

const app = createApp();
app.listen(config.port, "0.0.0.0", () => {
  logger.info({ port: config.port }, "Recording worker listening");
});
