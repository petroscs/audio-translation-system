import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { endListenSession, joinListen } from '../api/listen';
import type { ListenJoinResponse } from '../api/listen';
import { SignalingClient } from '../signaling/signaling';
import { connectRecvTransport, type RecvConnection } from '../webrtc/audioReceiver';

type Status = 'connecting' | 'listening' | 'error' | 'no-broadcast';

interface Caption {
  text: string;
  timestamp: number;
}

export default function Listen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [status, setStatus] = useState<Status>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [channelName, setChannelName] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const connectionRef = useRef<RecvConnection | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);
  const broadcastSessionIdRef = useRef<string | null>(null);
  const joinDataRef = useRef<{ listenerSessionId: string; accessToken: string } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('Missing session ID');
      return;
    }

    let cancelled = false;
    // Defer join so React Strict Mode's double-invoke doesn't create two sessions:
    // first mount schedules run, cleanup runs and cancels; second mount schedules run and it executes once.
    const timeoutId = setTimeout(() => {
      run();
    }, 0);

    async function run() {
      try {
        setStatus('connecting');
        setError(null);
        setAudioBlocked(false);

        const joinResult = await joinListen(sessionId!);
        if (!joinResult.ok) {
          if (joinResult.status === 404) {
            setStatus('no-broadcast');
            setError('No active broadcast for this session.');
          } else {
            setStatus('error');
            setError(joinResult.error ?? `Failed to join (${joinResult.status})`);
          }
          return;
        }

        const data = joinResult.data as ListenJoinResponse;
        if (cancelled) return;

        setEventName(typeof data.eventName === 'string' ? data.eventName : null);
        setChannelName(typeof data.channelName === 'string' ? data.channelName : null);
        broadcastSessionIdRef.current = sessionId ?? null;
        joinDataRef.current = {
          listenerSessionId: data.listenerSessionId,
          accessToken: data.accessToken,
        };

        const signaling = new SignalingClient(data.accessToken);
        signalingRef.current = signaling;
        await signaling.start();
        if (cancelled) return;

        const transport = await signaling.createTransport(
          data.listenerSessionId,
          'Receive'
        );
        if (cancelled) return;

        const consumer = await signaling.consume(transport.transportId, data.producerId);
        if (cancelled) return;

        const recvConn = await connectRecvTransport({
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
          consumerRtpParameters: consumer.rtpParameters,
        });
        connectionRef.current = recvConn;

        await signaling.connectTransport(transport.transportId, recvConn.dtlsParameters);
        if (cancelled) return;

        await signaling.joinSession(data.listenerSessionId);
        await signaling.subscribeToBroadcastSession(sessionId!);

        signaling.onCaption((c) => {
          const text = (c.text as string) ?? '';
          const ts = (c.timestamp as number) ?? 0;
          setCaptions((prev) => {
            const next = [...prev, { text, timestamp: ts }];
            return next.slice(-50);
          });
        });

        signaling.onActiveProducerChanged((sid, _producerId) => {
          if (sid !== sessionId) return;
          // Producer switched - would need to reconnect with new producerId
          // For now we ignore (translator resume creates new producer)
        });

        if (cancelled) return;
        setStatus('listening');
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      connectionRef.current?.close();
      connectionRef.current = null;
      signalingRef.current?.offCaption();
      signalingRef.current?.offActiveProducerChanged();
      const bid = broadcastSessionIdRef.current;
      if (bid) {
        signalingRef.current?.unsubscribeFromBroadcastSession(bid).catch(() => {});
      }
      signalingRef.current?.stop();
      signalingRef.current = null;
      const joinData = joinDataRef.current;
      joinDataRef.current = null;
      if (joinData) {
        endListenSession(joinData.listenerSessionId, joinData.accessToken).catch(() => {});
      }
    };
  }, [sessionId]);

  // Attach the receive stream to the audio element once it's in the DOM (status === 'listening').
  useEffect(() => {
    if (status !== 'listening' || !connectionRef.current || !audioRef.current) return;
    const stream = connectionRef.current.stream;
    audioRef.current.srcObject = stream;
    audioRef.current.autoplay = true;
    audioRef.current.setAttribute('playsinline', 'true');
    const el = audioRef.current;
    const onCanPlay = () => {
      el.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
    };
    el.addEventListener('canplay', onCanPlay);
    return () => el.removeEventListener('canplay', onCanPlay);
  }, [status]);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Listen</h1>

      {status === 'connecting' && (
        <p style={styles.status}>Connecting…</p>
      )}

      {status === 'no-broadcast' && (
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
          <p style={styles.hint}>Make sure the translator has started broadcasting.</p>
        </div>
      )}

      {status === 'error' && (
        <div style={styles.card}>
          <p style={styles.error}>{error}</p>
        </div>
      )}

      {status === 'listening' && (
        <>
          {(eventName || channelName) && (
            <p style={styles.info}>
              {[eventName, channelName].filter(Boolean).join(' · ')}
            </p>
          )}
          <audio ref={audioRef} autoPlay style={styles.audio} />
          {audioBlocked ? (
            <button
              type="button"
              style={styles.startAudioButton}
              onClick={() => {
                audioRef.current?.play().then(() => setAudioBlocked(false)).catch(() => {});
              }}
            >
              Click to start audio
            </button>
          ) : (
            <p style={styles.playing}>Listening…</p>
          )}
          {captions.length > 0 && (
            <div style={styles.captions}>
              {captions.map((c, i) => (
                <p key={`${c.timestamp}-${i}`} style={styles.caption}>
                  {c.text}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 24,
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 24,
  },
  status: {
    color: '#64748b',
  },
  card: {
    padding: 16,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  error: {
    color: '#dc2626',
    margin: 0,
  },
  hint: {
    color: '#64748b',
    marginTop: 8,
    fontSize: 14,
  },
  info: {
    color: '#64748b',
    marginBottom: 16,
    fontSize: 14,
  },
  audio: {
    width: '100%',
    marginBottom: 16,
  },
  startAudioButton: {
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#22c55e',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    marginBottom: 16,
  },
  playing: {
    color: '#22c55e',
    fontWeight: 500,
  },
  captions: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    maxHeight: 200,
    overflowY: 'auto',
  },
  caption: {
    margin: '0 0 8px 0',
    fontSize: 15,
    lineHeight: 1.5,
  },
};
