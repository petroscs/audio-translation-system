const os = require("os");

const cpuCount = os.cpus().length;

const listenIp = process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0";

// Resolve announced IP: clients (mobile/emulator) must reach mediasoup at this address.
// 127.0.0.1 fails for emulator and physical devices; use LAN IP when not explicitly set.
function resolveAnnouncedIp() {
  if (process.env.MEDIASOUP_ANNOUNCED_IP) {
    return process.env.MEDIASOUP_ANNOUNCED_IP.trim();
  }
  const nets = os.networkInterfaces();
  for (const addrs of Object.values(nets)) {
    for (const addr of addrs) {
      if (!addr.internal && addr.family === "IPv4") {
        return addr.address;
      }
    }
  }
  return "127.0.0.1";
}
const announcedIp = resolveAnnouncedIp();

const rtcMinPort = Number.parseInt(process.env.MEDIASOUP_RTC_MIN_PORT || "40000", 10);
const rtcMaxPort = Number.parseInt(process.env.MEDIASOUP_RTC_MAX_PORT || "49999", 10);

const workerCount = Number.parseInt(process.env.MEDIASOUP_WORKERS || String(cpuCount), 10);

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  }
];

const webRtcTransportOptions = {
  listenIps: [{ ip: listenIp, announcedIp }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: false, // Prefer TCP for Android emulator compatibility
  initialAvailableOutgoingBitrate: 1_000_000,
  minimumAvailableOutgoingBitrate: 600_000
};

module.exports = {
  mediaCodecs,
  webRtcTransportOptions,
  workerCount,
  rtcMinPort,
  rtcMaxPort
};
