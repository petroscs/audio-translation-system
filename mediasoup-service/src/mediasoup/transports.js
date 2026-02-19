const dns = require("dns").promises;
const net = require("net");
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

/**
 * Resolve hostname or special names to a numeric IP. mediasoup worker requires an IP, not a hostname.
 */
async function resolveIpToNumeric(ip) {
  if (!ip || typeof ip !== "string") return ip;
  const trimmed = ip.trim().toLowerCase();
  if (trimmed === "localhost") return "127.0.0.1";
  if (trimmed === "::1") return "127.0.0.1";
  if (net.isIP(trimmed)) return trimmed;
  const addresses = await dns.resolve4(trimmed);
  if (!addresses || addresses.length === 0) {
    throw new Error(`Could not resolve hostname to IP: ${ip}`);
  }
  return addresses[0];
}

async function connectPlainTransport(transportId, { ip, port }) {
  const numericIp = await resolveIpToNumeric(ip);
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort <= 0 || numericPort > 65535) {
    throw new Error(`Invalid port for plain transport connect: ${port}`);
  }
  console.log(`[connectPlainTransport] Looking for transport: ${transportId}`);
  console.log(`[connectPlainTransport] Available transports:`, Array.from(transportsById.keys()));
  
  const transport = transportsById.get(transportId);
  if (!transport) {
    throw new Error(`Plain transport not found. TransportId: ${transportId}`);
  }

  console.log(`[connectPlainTransport] Transport found, connecting to ${numericIp}:${numericPort} (resolved from ${ip})`);
  
  try {
    await transport.connect({ ip: numericIp, port: numericPort });
    console.log(`[connectPlainTransport] Transport connected successfully`);
    
    // Wait a bit for tuple to be available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const tuple = {
      localIp: transport.tuple?.localIp,
      localPort: transport.tuple?.localPort,
      remoteIp: transport.tuple?.remoteIp,
      remotePort: transport.tuple?.remotePort
    };
    
    console.log(`[connectPlainTransport] Tuple:`, tuple);
    return tuple;
  } catch (error) {
    console.error(`[connectPlainTransport] Error connecting transport:`, error);
    throw new Error(`Failed to connect plain transport: ${error.message}`);
  }
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
