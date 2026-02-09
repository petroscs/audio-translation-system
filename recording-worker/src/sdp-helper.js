"use strict";

/**
 * Build a minimal SDP file so FFmpeg can receive RTP Opus (dynamic payload type).
 * @param {number} rtpPort - Port the recording worker is listening on
 * @param {object} rtpParameters - Mediasoup consumer rtpParameters (codecs[].payloadType, mimeType, clockRate, channels)
 * @returns {string} SDP content
 */
function buildSdpForReceiving(rtpPort, rtpParameters) {
  const codecs = rtpParameters?.codecs || [];
  const audioCodec = codecs.find((c) => c.mimeType?.toLowerCase().startsWith("audio/"));
  if (!audioCodec) {
    throw new Error("No audio codec in rtpParameters");
  }

  const payloadType = audioCodec.payloadType ?? audioCodec.preferredPayloadType ?? 111;
  const mimeType = (audioCodec.mimeType || "audio/opus").toLowerCase();
  const clockRate = audioCodec.clockRate || 48000;
  const channels = audioCodec.channels || 2;
  const encodingName = mimeType.split("/")[1] || "opus";

  const rtpmap = `${encodingName}/${clockRate}${channels > 1 ? `/${channels}` : ""}`;

  return [
    "v=0",
    "o=- 0 0 IN IP4 127.0.0.1",
    "s=recording",
    "t=0 0",
    `m=audio ${rtpPort} RTP/AVP ${payloadType}`,
    "c=IN IP4 127.0.0.1",
    "a=recvonly",
    `a=rtpmap:${payloadType} ${rtpmap}`
  ].join("\r\n");
}

module.exports = { buildSdpForReceiving };
