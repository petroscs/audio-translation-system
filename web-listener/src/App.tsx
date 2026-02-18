import { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { getActiveBroadcasts, type ActiveBroadcast } from './api/listen';
import Listen from './pages/Listen';

const listenPageStyles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 24,
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    marginTop: 0,
    marginBottom: 8,
    fontSize: 24,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 24,
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  card: {
    display: 'block',
    width: '100%',
    padding: 16,
    marginBottom: 12,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    color: 'inherit',
    textDecoration: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    font: 'inherit',
    transition: 'background-color 0.15s, border-color 0.15s',
  },
  cardHover: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
  },
  cardMeta: {
    margin: '4px 0 0 0',
    fontSize: 14,
    color: '#64748b',
  },
  empty: {
    color: '#64748b',
    padding: 16,
    border: '1px dashed #e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  loading: {
    color: '#64748b',
  },
  refreshButton: {
    marginTop: 12,
    padding: '8px 16px',
    fontSize: 14,
    cursor: 'pointer',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
  },
};

function ListenPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const session = searchParams.get('session');
  const [broadcasts, setBroadcasts] = useState<ActiveBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBroadcasts = useCallback(() => {
    setLoadError(null);
    setLoading(true);
    getActiveBroadcasts().then((result) => {
      if (result.ok) {
        setBroadcasts(result.broadcasts);
        setLoadError(null);
      } else {
        setBroadcasts([]);
        setLoadError(result.error);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (session) {
      navigate(`/listen/${session}`, { replace: true });
      return;
    }
    loadBroadcasts();
  }, [session, navigate, loadBroadcasts]);

  if (session) return null;

  return (
    <div style={listenPageStyles.container}>
      <h1 style={listenPageStyles.title}>Listen</h1>
      <p style={listenPageStyles.subtitle}>
        Choose an active broadcast below or scan the QR code from the translator or admin dashboard.
      </p>
      {loading ? (
        <p style={listenPageStyles.loading}>Loading active broadcasts…</p>
      ) : loadError ? (
        <div style={listenPageStyles.empty}>
          <p style={{ margin: 0, color: '#dc2626' }}>Could not load broadcasts.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>{loadError}</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
            Set <code>VITE_API_URL</code> to your backend (e.g. http://localhost:5000) if the app is not proxied.
          </p>
          <button type="button" onClick={loadBroadcasts} style={listenPageStyles.refreshButton}>
            Retry
          </button>
        </div>
      ) : broadcasts.length === 0 ? (
        <div style={listenPageStyles.empty}>
          <p style={{ margin: 0 }}>No active broadcasts right now.</p>
          <p style={{ margin: '8px 0 0 0', fontSize: 14 }}>
            Make sure a translator has started broadcasting, or use a session link / QR code.
          </p>
          <button type="button" onClick={loadBroadcasts} style={listenPageStyles.refreshButton}>
            Refresh
          </button>
        </div>
      ) : (
        <ul style={listenPageStyles.list}>
          {broadcasts.map((b) => (
            <li key={b.broadcastSessionId}>
              <button
                type="button"
                style={listenPageStyles.card}
                onMouseEnter={(e) => Object.assign(e.currentTarget.style, listenPageStyles.cardHover)}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.borderColor = '';
                }}
                onClick={() => navigate(`/listen/${b.broadcastSessionId}`)}
              >
                <p style={listenPageStyles.cardTitle}>
                  {b.eventName || 'Untitled event'} · {b.channelName || 'Untitled channel'}
                </p>
                <p style={listenPageStyles.cardMeta}>
                  Click to start listening
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/listen/:sessionId" element={<Listen />} />
      <Route path="/" element={<ListenPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
