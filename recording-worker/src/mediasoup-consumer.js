"use strict";

const axios = require("axios");
const config = require("./config");

async function getRouterCapabilities(eventId, channelId, logger) {
  const baseUrl = config.mediasoupApiUrl;
  const res = await axios.get(`${baseUrl}/mediasoup/router-capabilities`, {
    params: { eventId, channelId },
    timeout: 5000
  });
  const rtpCapabilities = res.data?.rtpCapabilities;
  if (!rtpCapabilities) {
    throw new Error("Router capabilities missing rtpCapabilities");
  }
  logger?.info("Router capabilities fetched for recording");
  return rtpCapabilities;
}

async function setupMediasoupConsumer(sessionId, eventId, channelId, mediasoupProducerId, rtpHost, rtpPort, logger) {
  const baseUrl = config.mediasoupApiUrl;

  const createTransportRes = await axios.post(`${baseUrl}/mediasoup/plain-transport/create`, {
    sessionId,
    eventId,
    channelId
  });

  const transportId = createTransportRes.data.mediasoupTransportId;

  // Mediasoup requires a numeric IP; "localhost" is rejected
  const ip = rtpHost === "localhost" || rtpHost === "::1" ? "127.0.0.1" : rtpHost;

  const connectRes = await axios.post(`${baseUrl}/mediasoup/plain-transport/connect`, {
    transportId,
    ip,
    port: rtpPort
  });
  logger?.info(
    {
      transportId,
      requestedIp: ip,
      requestedPort: rtpPort,
      tuple: connectRes.data?.tuple,
      connectResponse: connectRes.data
    },
    "Plain transport connected - mediasoup will send RTP to remote address"
  );

  const consumerRes = await axios.post(`${baseUrl}/mediasoup/consumer/create`, {
    transportId,
    producerId: mediasoupProducerId
  });

  const rtpParameters =
    typeof consumerRes.data.rtpParameters === "string"
      ? JSON.parse(consumerRes.data.rtpParameters)
      : consumerRes.data.rtpParameters;

  logger?.info(
    {
      transportId,
      consumerId: consumerRes.data.mediasoupConsumerId,
      producerId: mediasoupProducerId,
      ip,
      port: rtpPort
    },
    "Mediasoup consumer created - RTP should flow from producer to this address"
  );

  return { transportId, rtpParameters };
}

module.exports = { getRouterCapabilities, setupMediasoupConsumer };
