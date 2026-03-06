export type MediasoupSendParams = {
  dtlsParameters: string;
  rtpParameters: string;
};

export type WebRtcBroadcastConnection = {
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  sendParams: MediasoupSendParams;
  close: () => void;
};

type DtlsParams = {
  role: string;
  fingerprints: Array<{ algorithm: string; value: string }>;
};

export async function startAudioCapture(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support microphone capture (getUserMedia).');
  }
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export async function connectSendTransport(params: {
  localStream: MediaStream;
  iceParametersJson: string;
  iceCandidatesJson: string;
  dtlsParametersJson: string;
}): Promise<WebRtcBroadcastConnection> {
  const iceParams = JSON.parse(params.iceParametersJson) as Record<string, unknown>;
  const iceCandidates = JSON.parse(params.iceCandidatesJson) as Record<string, unknown>[];
  const serverDtls = JSON.parse(params.dtlsParametersJson) as Record<string, unknown>;

  const pc = new RTCPeerConnection({ iceServers: [] } as RTCConfiguration);
  const audioTrack = params.localStream.getAudioTracks()[0];
  if (!audioTrack) throw new Error('No audio track in local stream');
  pc.addTrack(audioTrack, params.localStream);

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false,
  });
  const offerSdp = offer.sdp ?? '';
  if (!offerSdp) throw new Error('Failed to create SDP offer');

  await pc.setLocalDescription(offer);

  const localDtls = extractDtlsParameters(offerSdp);
  const rtpParams = extractRtpParameters(offerSdp);

  const answerSdp = buildRemoteAnswerSdp({
    iceParams,
    iceCandidates,
    serverDtls,
    localOfferSdp: offerSdp,
  });

  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));

  const close = () => {
    params.localStream.getTracks().forEach((t) => t.stop());
    pc.close();
  };

  return {
    peerConnection: pc,
    localStream: params.localStream,
    sendParams: {
      dtlsParameters: JSON.stringify(localDtls),
      rtpParameters: JSON.stringify(rtpParams),
    },
    close,
  };
}

function extractDtlsParameters(sdp: string): DtlsParams {
  const lines = sdp.split('\n');
  const fingerprints: Array<{ algorithm: string; value: string }> = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('a=fingerprint:')) continue;
    const content = line.substring('a=fingerprint:'.length);
    const parts = content.split(' ');
    if (parts.length >= 2) {
      const algorithm = parts[0];
      const value = parts.slice(1).join(' ').trim();
      if (algorithm && value) {
        fingerprints.push({ algorithm, value });
      }
    }
  }

  // Match Flutter translator behavior: role=server on the client side.
  return { role: 'server', fingerprints };
}

function extractRtpParameters(sdp: string): Record<string, unknown> {
  const lines = sdp.split('\n');
  const codecs: Array<Record<string, unknown>> = [];
  const headerExtensions: Array<Record<string, unknown>> = [];
  const encodings: Array<Record<string, unknown>> = [];
  let cname: string | undefined;
  let ssrc: number | undefined;
  let inAudio = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith('m=audio')) {
      inAudio = true;
      const parts = line.split(' ');
      for (let i = 3; i < parts.length; i++) {
        const pt = Number(parts[i]);
        void pt;
      }
      continue;
    }
    if (line.startsWith('m=') && !line.startsWith('m=audio')) {
      inAudio = false;
      continue;
    }
    if (!inAudio) continue;

    if (line.startsWith('a=rtpmap:')) {
      const content = line.substring('a=rtpmap:'.length);
      const spaceIdx = content.indexOf(' ');
      if (spaceIdx < 0) continue;
      const pt = Number(content.substring(0, spaceIdx));
      if (Number.isNaN(pt)) continue;
      const codecStr = content.substring(spaceIdx + 1);
      const codecParts = codecStr.split('/');
      const encodingName = codecParts[0];
      const clockRate = Number(codecParts[1] ?? 48000) || 48000;
      const channels = Number(codecParts[2] ?? 1) || 1;
      codecs.push({
        mimeType: `audio/${encodingName}`,
        payloadType: pt,
        clockRate,
        channels,
        parameters: {},
        rtcpFeedback: [],
      });
    }

    if (line.startsWith('a=fmtp:')) {
      const content = line.substring('a=fmtp:'.length);
      const spaceIdx = content.indexOf(' ');
      if (spaceIdx < 0) continue;
      const pt = Number(content.substring(0, spaceIdx));
      if (Number.isNaN(pt)) continue;
      const paramsStr = content.substring(spaceIdx + 1);
      const params: Record<string, unknown> = {};
      for (const p of paramsStr.split(';')) {
        const eqIdx = p.indexOf('=');
        if (eqIdx < 0) continue;
        const key = p.substring(0, eqIdx).trim();
        const rawVal = p.substring(eqIdx + 1).trim();
        const intVal = Number(rawVal);
        params[key] = Number.isNaN(intVal) ? rawVal : intVal;
      }
      const codec = codecs.find((c) => c.payloadType === pt);
      if (codec) codec.parameters = params;
    }

    if (line.startsWith('a=rtcp-fb:')) {
      const content = line.substring('a=rtcp-fb:'.length);
      const spaceIdx = content.indexOf(' ');
      if (spaceIdx < 0) continue;
      const pt = Number(content.substring(0, spaceIdx));
      if (Number.isNaN(pt)) continue;
      const fbStr = content.substring(spaceIdx + 1).trim();
      const fbParts = fbStr.split(' ');
      const codec = codecs.find((c) => c.payloadType === pt);
      if (codec) {
        const arr = (codec.rtcpFeedback as Array<Record<string, unknown>>) ?? [];
        arr.push({ type: fbParts[0] ?? '', parameter: fbParts.slice(1).join(' ') });
        codec.rtcpFeedback = arr;
      }
    }

    if (line.startsWith('a=extmap:')) {
      const content = line.substring('a=extmap:'.length);
      const parts = content.split(' ');
      if (parts.length < 2) continue;
      const idPartRaw = parts[0];
      const uri = parts[1];
      if (!idPartRaw || !uri) continue;
      const idPart = idPartRaw.split('/')[0];
      const id = Number(idPart);
      if (Number.isNaN(id)) continue;
      headerExtensions.push({ uri: uri.trim(), id, encrypt: false, parameters: {} });
    }

    if (line.startsWith('a=ssrc:')) {
      const content = line.substring('a=ssrc:'.length);
      const spaceIdx = content.indexOf(' ');
      if (spaceIdx < 0) continue;
      if (ssrc == null) {
        const candidate = Number(content.substring(0, spaceIdx));
        if (!Number.isNaN(candidate)) ssrc = candidate;
      }
      const attrStr = content.substring(spaceIdx + 1);
      if (attrStr.startsWith('cname:')) {
        cname = attrStr.substring('cname:'.length).trim();
      }
    }
  }

  // Only include opus (first audio codec that mediasoup supports), matching Flutter behavior.
  const opus = codecs.find((c) => String(c.mimeType).toLowerCase() === 'audio/opus') ?? codecs[0];
  const selectedCodecs = opus ? [opus] : [];

  if (ssrc != null) encodings.push({ ssrc });

  return {
    codecs: selectedCodecs,
    headerExtensions,
    encodings,
    rtcp: {
      cname: cname ?? '',
      reducedSize: true,
    },
  };
}

function buildRemoteAnswerSdp(args: {
  iceParams: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  serverDtls: Record<string, unknown>;
  localOfferSdp: string;
}): string {
  const offerLines = args.localOfferSdp.split('\n').map((l) => l.trim());

  let mid = '0';
  for (const line of offerLines) {
    if (line.startsWith('a=mid:')) {
      mid = line.substring('a=mid:'.length).trim() || '0';
      break;
    }
  }

  let mLine = 'm=audio 7 UDP/TLS/RTP/SAVPF 111';
  for (const line of offerLines) {
    if (line.startsWith('m=audio')) {
      mLine = line;
      break;
    }
  }

  const codecLines: string[] = [];
  let inAudio = false;
  for (const line of offerLines) {
    if (line.startsWith('m=audio')) {
      inAudio = true;
      continue;
    }
    if (line.startsWith('m=') && !line.startsWith('m=audio')) {
      inAudio = false;
      continue;
    }
    if (!inAudio) continue;
    if (line.startsWith('a=rtpmap:') || line.startsWith('a=fmtp:') || line.startsWith('a=rtcp-fb:')) {
      codecLines.push(line);
    }
  }

  const fingerprints = (args.serverDtls.fingerprints as Array<{ algorithm?: string; value?: string }>) ?? [];
  const fingerprint = fingerprints.find((f) => f.algorithm === 'sha-256') ?? fingerprints[0];

  const out: string[] = [];
  out.push('v=0');
  out.push('o=- 0 0 IN IP4 0.0.0.0');
  out.push('s=-');
  out.push('t=0 0');
  out.push('a=ice-lite');
  out.push(`a=group:BUNDLE ${mid}`);
  out.push('a=msid-semantic: WMS');
  out.push(mLine);
  out.push('c=IN IP4 127.0.0.1');
  out.push('a=rtcp:9 IN IP4 0.0.0.0');

  out.push(`a=ice-ufrag:${String(args.iceParams.usernameFragment ?? '')}`);
  out.push(`a=ice-pwd:${String(args.iceParams.password ?? '')}`);

  if (fingerprint) {
    out.push(`a=fingerprint:${fingerprint.algorithm ?? 'sha-256'} ${fingerprint.value ?? ''}`);
  }

  // Server (remote) initiates DTLS; client is passive.
  out.push('a=setup:active');
  out.push(`a=mid:${mid}`);
  out.push('a=recvonly');
  out.push('a=rtcp-mux');

  for (const line of codecLines) out.push(line);

  for (const c of args.iceCandidates) {
    const foundation = c.foundation ?? 'udpcandidate';
    const priority = c.priority ?? 1076302079;
    const ip = c.ip ?? '127.0.0.1';
    const port = c.port ?? 40000;
    const protocol = String(c.protocol ?? 'udp').toLowerCase();
    const type = c.type ?? 'host';
    let candidateLine = `a=candidate:${foundation} 1 ${protocol} ${priority} ${ip} ${port} typ ${type}`;
    if (protocol === 'tcp') {
      const tcpType = c.tcpType ?? 'passive';
      candidateLine += ` tcptype ${tcpType}`;
    }
    out.push(candidateLine);
  }
  out.push('a=end-of-candidates');

  return out.join('\r\n') + '\r\n';
}

