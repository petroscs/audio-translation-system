"use strict";

const express = require("express");
const pino = require("pino");
const pinoHttp = require("pino-http");
const config = require("./config");
const { setupMediasoupConsumer } = require("./mediasoup-consumer");
const { createRtpReceiver, getNextRtpPort } = require("./rtp-receiver");
const { createWhisperProcessor } = require("./whisper-processor");
const { sendCaption } = require("./caption-sender");

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined
});

const activePipelines = new Map();

async function startPipeline(sessionId, eventId, channelId, producerId, mediasoupProducerId) {
  if (activePipelines.has(sessionId)) {
    logger.warn({ sessionId }, "Pipeline already active");
    return;
  }

  if (activePipelines.size >= config.maxConcurrentSessions) {
    throw new Error("Max concurrent sessions reached");
  }

  const rtpPort = getNextRtpPort();
  let rtpReceiver = null;
  let whisperProcessor = null;

  const onCaption = async (caption) => {
    try {
      await sendCaption(
        sessionId,
        caption.text,
        caption.timestamp,
        caption.confidence ?? 0.95
      );
    } catch (err) {
      logger.error({ err, sessionId }, "Failed to send caption");
    }
  };

  whisperProcessor = createWhisperProcessor(onCaption, logger);

  rtpReceiver = createRtpReceiver(rtpPort, (pcmChunk) => {
    whisperProcessor?.addPcm(pcmChunk);
  }, logger);

  try {
    await setupMediasoupConsumer(
      sessionId,
      eventId,
      channelId,
      mediasoupProducerId,
      config.rtpHost,
      rtpPort,
      logger
    );
  } catch (err) {
    rtpReceiver?.close();
    whisperProcessor?.close();
    throw err;
  }

  activePipelines.set(sessionId, {
    rtpReceiver,
    whisperProcessor,
    sessionId
  });

  logger.info({ sessionId, rtpPort }, "STT pipeline started");
}

function stopPipeline(sessionId) {
  const pipeline = activePipelines.get(sessionId);
  if (!pipeline) {
    logger.warn({ sessionId }, "No pipeline found for session");
    return;
  }

  pipeline.rtpReceiver?.close();
  pipeline.whisperProcessor?.close();
  activePipelines.delete(sessionId);

  logger.info({ sessionId }, "STT pipeline stopped");
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

  app.post("/stt/start", async (req, res) => {
    try {
      const { sessionId, eventId, channelId, producerId, mediasoupProducerId } = req.body || {};

      if (!sessionId || !mediasoupProducerId) {
        res.status(400).json({
          error: "sessionId and mediasoupProducerId are required."
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
      logger.error({ err }, "Failed to start STT pipeline");
      res.status(500).json({ error: err.message || "Internal error" });
    }
  });

  app.post("/stt/stop", (req, res) => {
    try {
      const { sessionId } = req.body || {};

      if (!sessionId) {
        res.status(400).json({ error: "sessionId is required." });
        return;
      }

      stopPipeline(sessionId);
      res.status(200).json({ stopped: true });
    } catch (err) {
      logger.error({ err }, "Failed to stop STT pipeline");
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
  logger.info({ port: config.port }, "STT worker listening");
});
