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
const { createProducer, getProducerMeta, getProducerStats, getProducerById } = require("./mediasoup/producers");
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
        iceCandidates: JSON.stringify(transport.iceCandidates),
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
      if (!Array.isArray(parsedDtlsParameters.fingerprints)) {
        parsedDtlsParameters.fingerprints = [];
      }
      if (parsedDtlsParameters.fingerprints.length === 0) {
        parsedDtlsParameters.fingerprints = [
          { algorithm: "sha-256", value: "00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00" }
        ];
      }
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
      if (!Array.isArray(parsedRtpParameters.codecs) || parsedRtpParameters.codecs.length === 0) {
        if (kind === "audio") {
          parsedRtpParameters.codecs = [
            { mimeType: "audio/opus", clockRate: 48000, channels: 2, payloadType: 111 }
          ];
        }
      }
      if (!Array.isArray(parsedRtpParameters.encodings) || parsedRtpParameters.encodings.length === 0) {
        parsedRtpParameters.encodings = [{ ssrc: 1 }];
      }
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

  app.get("/mediasoup/producer/:producerId/stats", async (req, res) => {
    try {
      const { producerId } = req.params;
      if (!producerId) {
        res.status(400).json({ error: "producerId is required." });
        return;
      }

      const stats = await getProducerStats(producerId);
      if (!stats) {
        res.status(404).json({ error: "Producer not found." });
        return;
      }

      res.status(200).json(stats);
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
        console.warn(`[Consumer] Producer not found: producerId=${producerId} (broadcaster may have disconnected)`);
        res.status(404).json({ error: "Producer not found. The broadcaster may have disconnected." });
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

      // Prefer producer's consumableRtpParameters when available so router.canConsume() always
      // passes (backend and some clients do not send rtpCapabilities). Fall back to client-sent
      // caps or router.rtpCapabilities.
      let parsedRtpCapabilities;
      const producer = getProducerById(producerId);
      const consumable = producer?.consumableRtpParameters;
      const fromConsumable = consumable?.codecs?.length > 0;
      if (fromConsumable) {
        const c = consumable;
        const producerKind = producer?.kind ?? 'audio';
        parsedRtpCapabilities = {
          codecs: (c.codecs || []).map((codec) => ({
            mimeType: codec.mimeType,
            clockRate: codec.clockRate,
            channels: codec.channels,
            parameters: codec.parameters || {},
            rtcpFeedback: codec.rtcpFeedback || []
          })),
          headerExtensions: (c.headerExtensions || []).map((e) => ({
            kind: producerKind,
            uri: e.uri,
            preferredId: typeof e.id === 'number' ? e.id : parseInt(e.id, 10) || 0,
            preferredEncrypt: Boolean(e.encrypt),
            direction: 'sendrecv'
          }))
        };
      }
      if (!fromConsumable) {
        const clientSentCaps = rtpCapabilities && typeof rtpCapabilities === "object" && rtpCapabilities.codecs?.length;
        parsedRtpCapabilities = clientSentCaps
          ? parseJsonString(rtpCapabilities, rtpCapabilities)
          : parseJsonString(rtpCapabilities, router.rtpCapabilities);
      }

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
      console.log(`[PlainTransport] Connect request - transportId: ${transportId}, ip: ${ip}, port: ${port}`);
      
      if (!transportId || !ip || !port) {
        const missing = [];
        if (!transportId) missing.push("transportId");
        if (!ip) missing.push("ip");
        if (!port) missing.push("port");
        res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
        return;
      }

      const tuple = await connectPlainTransport(transportId, { ip, port });
      console.log(`[PlainTransport] Connected successfully - tuple:`, tuple);
      res.status(200).json({ connected: true, tuple });
    } catch (error) {
      console.error(`[PlainTransport] Connect error:`, error);
      console.error(`[PlainTransport] Error stack:`, error.stack);
      res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
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

  app.get("/mediasoup/router-capabilities", async (req, res) => {
    try {
      const routerKey = resolveRouterKey({
        eventId: req.query.eventId,
        channelId: req.query.channelId
      });
      if (!routerKey) {
        res.status(400).json({ error: "eventId and channelId are required." });
        return;
      }

      const { router } = await getOrCreateRouter({ key: routerKey });
      const rtpCapabilities = router.rtpCapabilities;
      res.status(200).json({ rtpCapabilities });
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
