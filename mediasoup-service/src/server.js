const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const {
  createWorker,
  initializeWorkers,
  getWorkerCount
} = require("./mediasoup/workers");
const {
  getOrCreateRouter,
  getRouterById,
  getRouterStats,
  getRouterCount
} = require("./mediasoup/routers");
const {
  createTransport,
  createPlainTransport,
  connectPlainTransport,
  getTransportById,
  getTransportMeta
} = require("./mediasoup/transports");
const { createProducer, getProducerMeta } = require("./mediasoup/producers");
const { createConsumer } = require("./mediasoup/consumers");
const { workerCount } = require("./mediasoup/config");

function resolveRouterKey(payload) {
  if (!payload) {
    return undefined;
  }

  if (payload.routerKey) {
    return String(payload.routerKey);
  }

  if (payload.eventId && payload.channelId) {
    return `${payload.eventId}:${payload.channelId}`;
  }

  if (payload.sessionId) {
    return String(payload.sessionId);
  }

  return undefined;
}

function parseJsonString(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.post("/mediasoup/worker/create", async (req, res) => {
    try {
      await initializeWorkers(workerCount);
      const { workerId, worker } = await createWorker();
      res.status(201).json({
        workerId,
        pid: worker.pid
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/router/create", async (req, res) => {
    try {
      const routerKey = resolveRouterKey(req.body);
      const { workerId } = req.body || {};
      const { routerId, router } = await getOrCreateRouter({
        key: routerKey,
        workerId
      });

      res.status(201).json({
        routerId,
        rtpCapabilities: router.rtpCapabilities
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/transport/create", async (req, res) => {
    try {
      const { direction, sessionId } = req.body || {};
      const routerKey = resolveRouterKey(req.body);

      const { routerId, router } = await getOrCreateRouter({
        key: routerKey
      });

      const transport = await createTransport({
        router,
        routerId,
        sessionId,
        direction
      });

      res.status(201).json({
        mediasoupTransportId: transport.id,
        iceParameters: JSON.stringify(transport.iceParameters),
        dtlsParameters: JSON.stringify(transport.dtlsParameters)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/transport/connect", async (req, res) => {
    try {
      const { transportId, dtlsParameters } = req.body || {};
      const transport = getTransportById(transportId);

      if (!transport) {
        res.status(404).json({ error: "Transport not found." });
        return;
      }

      const parsedDtlsParameters = parseJsonString(dtlsParameters, dtlsParameters);
      await transport.connect({ dtlsParameters: parsedDtlsParameters });

      res.status(200).json({ connected: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/producer/create", async (req, res) => {
    try {
      const { transportId, kind, rtpParameters } = req.body || {};
      if (!transportId || !kind || !rtpParameters) {
        res.status(400).json({ error: "transportId, kind, and rtpParameters are required." });
        return;
      }

      const transport = getTransportById(transportId);
      const transportMeta = transportId ? getTransportMeta(transportId) : undefined;

      if (!transport || !transportMeta) {
        res.status(404).json({ error: "Transport not found." });
        return;
      }

      const parsedRtpParameters = parseJsonString(rtpParameters, rtpParameters);
      const producer = await createProducer({
        transport,
        routerId: transportMeta.routerId,
        kind,
        rtpParameters: parsedRtpParameters
      });

      res.status(201).json({
        mediasoupProducerId: producer.id
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/consumer/create", async (req, res) => {
    try {
      const { transportId, producerId, rtpCapabilities } = req.body || {};
      if (!transportId || !producerId) {
        res.status(400).json({ error: "transportId and producerId are required." });
        return;
      }

      const transport = getTransportById(transportId);
      const transportMeta = transportId ? getTransportMeta(transportId) : undefined;
      const producerMeta = producerId ? getProducerMeta(producerId) : undefined;

      if (!transport || !transportMeta) {
        res.status(404).json({ error: "Transport not found." });
        return;
      }

      if (!producerMeta) {
        res.status(404).json({ error: "Producer not found." });
        return;
      }

      if (producerMeta.routerId !== transportMeta.routerId) {
        res.status(409).json({ error: "Producer is not on the same router." });
        return;
      }

      const router = getRouterById(transportMeta.routerId);
      if (!router) {
        res.status(404).json({ error: "Router not found." });
        return;
      }

      const parsedRtpCapabilities = parseJsonString(
        rtpCapabilities,
        rtpCapabilities ?? router.rtpCapabilities
      );

      const consumer = await createConsumer({
        transport,
        router,
        producerId,
        rtpCapabilities: parsedRtpCapabilities
      });

      res.status(201).json({
        mediasoupConsumerId: consumer.id,
        mediasoupProducerId: producerId,
        rtpParameters: JSON.stringify(consumer.rtpParameters)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/plain-transport/create", async (req, res) => {
    try {
      const { sessionId } = req.body || {};
      const routerKey = resolveRouterKey(req.body);

      const { routerId, router } = await getOrCreateRouter({
        key: routerKey
      });

      const transport = await createPlainTransport({
        router,
        routerId,
        sessionId
      });

      res.status(201).json({
        mediasoupTransportId: transport.id,
        tuple: transport.tuple
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/mediasoup/plain-transport/connect", async (req, res) => {
    try {
      const { transportId, ip, port } = req.body || {};
      if (!transportId || !ip || !port) {
        res.status(400).json({ error: "transportId, ip, and port are required." });
        return;
      }

      await connectPlainTransport(transportId, { ip, port });
      res.status(200).json({ connected: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/mediasoup/router/:id/stats", async (req, res) => {
    try {
      const stats = await getRouterStats(req.params.id);
      if (!stats) {
        res.status(404).json({ error: "Router not found." });
        return;
      }

      res.status(200).json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/mediasoup/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      workers: getWorkerCount(),
      routers: getRouterCount()
    });
  });

  return app;
}

module.exports = { createServer };
