const { webRtcTransportOptions } = require("./config");

const transportsById = new Map();
const transportMetaById = new Map();

const listenIp = process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0";

async function createTransport({ router, routerId, sessionId, direction }) {
  const transport = await router.createWebRtcTransport(webRtcTransportOptions);

  transportsById.set(transport.id, transport);
  transportMetaById.set(transport.id, {
    routerId,
    sessionId,
    direction
  });

  transport.on("dtlsstatechange", (state) => {
    if (state === "closed") {
      transport.close();
    }
  });

  transport.on("close", () => {
    transportsById.delete(transport.id);
    transportMetaById.delete(transport.id);
  });

  return transport;
}

async function createPlainTransport({ router, routerId, sessionId }) {
  const transport = await router.createPlainTransport({
    listenIp,
    rtcpMux: true,
    comedia: false
  });

  transportsById.set(transport.id, transport);
  transportMetaById.set(transport.id, {
    routerId,
    sessionId,
    direction: "recv"
  });

  transport.on("close", () => {
    transportsById.delete(transport.id);
    transportMetaById.delete(transport.id);
  });

  return transport;
}

async function connectPlainTransport(transportId, { ip, port }) {
  const transport = transportsById.get(transportId);
  if (!transport) {
    throw new Error("Plain transport not found.");
  }
  await transport.connect({ ip, port });
}

function getTransportById(transportId) {
  return transportsById.get(transportId);
}

function getTransportMeta(transportId) {
  return transportMetaById.get(transportId);
}

module.exports = {
  createTransport,
  createPlainTransport,
  connectPlainTransport,
  getTransportById,
  getTransportMeta
};
