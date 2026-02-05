"use strict";

const axios = require("axios");
const config = require("./config");

async function setupMediasoupConsumer(sessionId, mediasoupProducerId, rtpHost, rtpPort, logger) {
  const baseUrl = config.mediasoupApiUrl;

  const createTransportRes = await axios.post(`${baseUrl}/mediasoup/plain-transport/create`, {
    sessionId
  });

  const transportId = createTransportRes.data.mediasoupTransportId;

  await axios.post(`${baseUrl}/mediasoup/plain-transport/connect`, {
    transportId,
    ip: rtpHost,
    port: rtpPort
  });

  const consumerRes = await axios.post(`${baseUrl}/mediasoup/consumer/create`, {
    transportId,
    producerId: mediasoupProducerId
  });

  logger?.info(
    { transportId, consumerId: consumerRes.data.mediasoupConsumerId },
    "Mediasoup consumer created"
  );

  return transportId;
}

module.exports = { setupMediasoupConsumer };
