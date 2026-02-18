/**
 * Creates a PeerConnection for receiving audio from mediasoup, using manual SDP construction
 * (same approach as the Flutter listener app).
 */
export interface RecvTransportParams {
  iceParameters: string;
  iceCandidates: string;
  dtlsParameters: string;
  consumerRtpParameters: string;
}

export interface DtlsParams {
  role: string;
  fingerprints: Array<{ algorithm: string; value: string }>;
}

export interface RecvConnection {
  dtlsParameters: string;
  stream: MediaStream;
  close: () => void;
}

export async function connectRecvTransport(params: RecvTransportParams): Promise<RecvConnection> {
  const iceParams = JSON.parse(params.iceParameters) as Record<string, unknown>;
  const iceCandidates = JSON.parse(params.iceCandidates) as Record<string, unknown>[];
  const serverDtls = JSON.parse(params.dtlsParameters) as Record<string, unknown>;
  const rtpParams = JSON.parse(params.consumerRtpParameters) as Record<string, unknown>;

  const remoteStream = new MediaStream();
  const pc = new RTCPeerConnection({
    iceServers: [],
  } as RTCConfiguration);

  pc.ontrack = (ev) => {
    if (ev.track.kind === 'audio') {
      remoteStream.addTrack(ev.track);
    }
  };

  const offerSdp = buildRemoteOfferSdp(iceParams, iceCandidates, serverDtls, rtpParams);
  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: offerSdp }));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  const localDtls = extractDtlsParameters(answer.sdp ?? '');
  const dtlsParameters = JSON.stringify(localDtls);

  const close = () => {
    remoteStream.getTracks().forEach((t) => t.stop());
    pc.close();
  };

  return { dtlsParameters, stream: remoteStream, close };
}

function extractDtlsParameters(sdp: string): DtlsParams {
  const lines = sdp.split('\n');
  const fingerprints: Array<{ algorithm: string; value: string }> = [];
  let role = 'server';

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('a=fingerprint:')) {
      const parts = trimmed.substring('a=fingerprint:'.length).split(' ');
      if (parts.length >= 2) {
        fingerprints.push({ algorithm: parts[0], value: parts.slice(1).join(' ').trim() });
      }
    }
    if (trimmed.startsWith('a=setup:')) {
      const setup = trimmed.substring('a=setup:'.length).trim();
      if (setup === 'active') role = 'client';
      else if (setup === 'passive') role = 'server';
      else role = 'auto';
    }
  }

  return { role, fingerprints };
}

function buildRemoteOfferSdp(
  iceParams: Record<string, unknown>,
  iceCandidates: Record<string, unknown>[],
  serverDtls: Record<string, unknown>,
  rtpParams: Record<string, unknown>
): string {
  const codecs = (rtpParams.codecs as Record<string, unknown>[]) ?? [];
  const headerExtensions = (rtpParams.headerExtensions as Record<string, unknown>[]) ?? [];
  const encodings = (rtpParams.encodings as Record<string, unknown>[]) ?? [];
  const rtcp = (rtpParams.rtcp as Record<string, unknown>) ?? {};

  const payloadTypes = codecs.map((c) => String((c as Record<string, unknown>).payloadType ?? '111'));
  const ptString = payloadTypes.length > 0 ? payloadTypes.join(' ') : '111';

  const fingerprints = (serverDtls.fingerprints as Array<{ algorithm?: string; value?: string }>) ?? [];
  const fingerprint = fingerprints.find((f) => f.algorithm === 'sha-256') ?? fingerprints[0];

  let ssrc: number | undefined;
  if (encodings.length > 0) {
    ssrc = encodings[0].ssrc as number | undefined;
  }

  const sb: string[] = [];
  sb.push('v=0');
  sb.push('o=- 0 0 IN IP4 0.0.0.0');
  sb.push('s=-');
  sb.push('t=0 0');
  sb.push('a=ice-lite');
  sb.push('a=group:BUNDLE 0');
  sb.push('a=msid-semantic: WMS *');
  sb.push(`m=audio 9 UDP/TLS/RTP/SAVPF ${ptString}`);
  sb.push('c=IN IP4 127.0.0.1');
  sb.push('a=rtcp:9 IN IP4 0.0.0.0');
  sb.push(`a=ice-ufrag:${iceParams.usernameFragment ?? ''}`);
  sb.push(`a=ice-pwd:${iceParams.password ?? ''}`);
  if (fingerprint) {
    sb.push(`a=fingerprint:${fingerprint.algorithm ?? 'sha-256'} ${fingerprint.value ?? ''}`);
  }
  sb.push('a=setup:actpass');
  sb.push('a=mid:0');
  sb.push('a=sendonly');
  sb.push('a=rtcp-mux');
  sb.push('a=msid:server-stream server-audio');

  for (const ext of headerExtensions) {
    sb.push(`a=extmap:${ext.id} ${ext.uri}`);
  }

  for (const codec of codecs) {
    const pt = codec.payloadType;
    const mimeType = String((codec.mimeType as string) ?? 'opus').split('/').pop();
    const clockRate = codec.clockRate ?? 48000;
    const channels = codec.channels as number | undefined;
    const rtpmap =
      channels != null && channels > 1 ? `${mimeType}/${clockRate}/${channels}` : `${mimeType}/${clockRate}`;
    sb.push(`a=rtpmap:${pt} ${rtpmap}`);
    const params = codec.parameters as Record<string, unknown> | undefined;
    if (params && Object.keys(params).length > 0) {
      const fmtpStr = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(';');
      sb.push(`a=fmtp:${pt} ${fmtpStr}`);
    }
    const rtcpFb = codec.rtcpFeedback as Array<{ type?: string; parameter?: string }> | undefined;
    if (rtcpFb) {
      for (const fb of rtcpFb) {
        const fbType = fb.type ?? '';
        const fbParam = fb.parameter ?? '';
        if (fbType) {
          sb.push(`a=rtcp-fb:${pt} ${fbType}${fbParam ? ` ${fbParam}` : ''}`);
        }
      }
    }
  }

  if (ssrc != null) {
    const cname = (rtcp.cname as string) ?? 'mediasoup';
    sb.push(`a=ssrc:${ssrc} cname:${cname}`);
    sb.push(`a=ssrc:${ssrc} msid:server-stream server-audio`);
  }

  for (const candidate of iceCandidates) {
    const foundation = candidate.foundation ?? 'udpcandidate';
    const priority = candidate.priority ?? 1076302079;
    const ip = candidate.ip ?? '127.0.0.1';
    const port = candidate.port ?? 40000;
    const protocol = String(candidate.protocol ?? 'udp').toLowerCase();
    const type = candidate.type ?? 'host';
    let line = `a=candidate:${foundation} 1 ${protocol} ${priority} ${ip} ${port} typ ${type}`;
    if (protocol === 'tcp') {
      const tcpType = candidate.tcpType ?? 'passive';
      line += ` tcptype ${tcpType}`;
    }
    sb.push(line);
  }

  return sb.join('\r\n') + '\r\n';
}

