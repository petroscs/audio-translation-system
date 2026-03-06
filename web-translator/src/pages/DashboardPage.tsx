import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getListenerBaseUrl } from '../api/config';
import * as sessionsApi from '../api/sessions';
import { getAccessToken } from '../api/tokens';
import type { Session } from '../api/types';
import { SignalingClient } from '../signaling/signaling';
import { connectSendTransport, startAudioCapture, type WebRtcBroadcastConnection } from '../webrtc/webrtcBroadcaster';
import { useAudioLevel } from '../webrtc/useAudioLevel';
import { isAdminToken } from '../utils/jwt';

type Status = 'idle' | 'connecting' | 'broadcasting' | 'error';

export default function DashboardPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [producerId, setProducerId] = useState<string | null>(null);
  const [mediasoupProducerId, setMediasoupProducerId] = useState<string | null>(null);
  const [diag, setDiag] = useState<string | null>(null);

  const signalingRef = useRef<SignalingClient | null>(null);
  const webrtcRef = useRef<WebRtcBroadcastConnection | null>(null);

  const audioLevel = useAudioLevel(webrtcRef.current?.localStream ?? null);

  const listenUrl = useMemo(() => {
    if (!sessionId) return '';
    return `${getListenerBaseUrl()}/listen/${sessionId}`;
  }, [sessionId]);

  const isAdmin = useMemo(() => {
    const token = getAccessToken();
    return token ? isAdminToken(token) : false;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    sessionsApi
      .getSession(sessionId)
      .then((res) => {
        if (res.ok) setSession(res.data);
      })
      .catch(() => {});
  }, [sessionId]);

  async function startBroadcast() {
    if (!sessionId) return;
    setStatus('connecting');
    setError(null);
    setDiag(null);

    const token = getAccessToken();
    if (!token) {
      setStatus('error');
      setError('Not logged in.');
      return;
    }

    try {
      const localStream = await startAudioCapture();

      const signaling = new SignalingClient(token);
      signalingRef.current = signaling;
      await signaling.start();

      const transport = await signaling.createTransport(sessionId, 'Send');
      const webrtc = await connectSendTransport({
        localStream,
        iceParametersJson: transport.iceParameters,
        iceCandidatesJson: transport.iceCandidates,
        dtlsParametersJson: transport.dtlsParameters,
      });
      webrtcRef.current = webrtc;

      await signaling.connectTransport(transport.transportId, webrtc.sendParams.dtlsParameters);
      const producer = await signaling.produce(transport.transportId, 'Audio', webrtc.sendParams.rtpParameters);

      setProducerId(producer.producerId);
      setMediasoupProducerId(producer.mediasoupProducerId);
      setStatus('broadcasting');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
      await stopBroadcast(true, true);
    }
  }

  async function stopBroadcast(skipPauseApi = false, preserveStatus = false) {
    try {
      await signalingRef.current?.stop();
    } catch {
      // ignore
    }
    signalingRef.current = null;

    try {
      webrtcRef.current?.close();
    } catch {
      // ignore
    }
    webrtcRef.current = null;

    setProducerId(null);
    setMediasoupProducerId(null);
    if (!preserveStatus) setStatus('idle');

    if (!skipPauseApi && sessionId) {
      await sessionsApi.pauseBroadcast(sessionId).catch(() => {});
    }
  }

  async function endSession() {
    if (!sessionId) return;
    if (status === 'broadcasting' || status === 'connecting') {
      setError('Stop broadcasting before ending the session.');
      return;
    }
    const res = await sessionsApi.endSession(sessionId);
    if (!res.ok) {
      setError(res.error ?? `Failed to end session (${res.status})`);
      return;
    }
    navigate('/events');
  }

  async function diagnosticsSnapshot() {
    if (!sessionId || !mediasoupProducerId) return;
    const statsRes = await sessionsApi.getProducerStats(sessionId, mediasoupProducerId);
    const pc = webrtcRef.current?.peerConnection;
    let outStats: Record<string, unknown> = {};
    if (pc) {
      try {
        const reports = await pc.getStats();
        for (const r of reports.values()) {
          if (r.type === 'outbound-rtp' && (r as unknown as { kind?: string }).kind === 'audio') {
            outStats = r as unknown as Record<string, unknown>;
            break;
          }
        }
      } catch {
        // ignore
      }
    }
    const payload = {
      ts: new Date().toISOString(),
      status,
      pc: pc
        ? {
            connectionState: pc.connectionState,
            iceConnectionState: pc.iceConnectionState,
            signalingState: pc.signalingState,
          }
        : null,
      outboundRtp: outStats,
      producerStats: statsRes.ok ? statsRes.data : { error: statsRes.error, status: statsRes.status },
    };
    setDiag(JSON.stringify(payload, null, 2));
  }

  useEffect(() => {
    return () => {
      stopBroadcast(true).catch(() => {});
    };
  }, []);

  if (!sessionId) {
    return <div className="alert alert-error">Missing session ID.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Translator Dashboard</h2>
          <Link to="/events" className="btn btn-secondary">
            Back
          </Link>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <div className="muted">Session</div>
          <div style={{ fontFamily: 'monospace' }}>{sessionId}</div>
          {session && (
            <div className="muted" style={{ marginTop: 6 }}>
              {session.status} · event {session.eventId} · channel {session.channelId}
            </div>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ marginTop: '0.9rem' }}>
          <div className="muted" style={{ marginBottom: 6 }}>
            Microphone level
          </div>
          <div
            style={{
              height: 14,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.12)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(audioLevel * 100)}%`,
                height: '100%',
                background: audioLevel > 0.02 ? '#22c55e' : 'rgba(255,255,255,0.25)',
                transition: 'width 80ms linear',
              }}
            />
          </div>
        </div>

        <div className="row" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => startBroadcast()}
            disabled={status === 'broadcasting' || status === 'connecting'}
          >
            {status === 'connecting' ? 'Starting…' : status === 'broadcasting' ? 'Broadcasting' : 'Start broadcast'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => stopBroadcast(false)}
            disabled={status !== 'broadcasting'}
          >
            Stop
          </button>
          <button type="button" className="btn btn-danger" onClick={() => endSession()} disabled={status !== 'idle'}>
            End session
          </button>
          {producerId && (
            <span className="muted" style={{ fontFamily: 'monospace' }}>
              producer {producerId}
            </span>
          )}
        </div>
      </div>

      <div className="card print-qr-area">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Listeners: scan to join</div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <QRCodeSVG value={listenUrl} size={160} level="M" />
          <div style={{ flex: 1, minWidth: 280 }}>
            <div className="muted" style={{ marginBottom: 6 }}>
              Link
            </div>
            <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{listenUrl}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: '1rem' }}
          onClick={() => window.print()}
        >
          Print QR
        </button>
      </div>

      {isAdmin && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800 }}>Diagnostics</div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={status !== 'broadcasting'}
              onClick={() => diagnosticsSnapshot()}
            >
              Snapshot
            </button>
          </div>
          {diag ? (
            <pre
              style={{
                marginTop: 10,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              {diag}
            </pre>
          ) : (
            <div className="muted" style={{ marginTop: 10 }}>
              Starts showing data after you begin broadcasting.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

