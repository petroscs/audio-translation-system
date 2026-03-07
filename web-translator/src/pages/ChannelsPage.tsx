import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as channelsApi from '../api/channels';
import * as sessionsApi from '../api/sessions';
import type { Channel, Session } from '../api/types';
import { LanguageFlag } from '../components/LanguageFlag';
import { getLanguageName } from '../utils/languages';

export default function ChannelsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<string | null>(null);

  const canLoad = useMemo(() => Boolean(eventId), [eventId]);

  async function load() {
    if (!eventId) return;
    setBusy(true);
    setError(null);
    const res = await channelsApi.getChannels(eventId);
    if (!res.ok) {
      setError(res.error ?? `Failed to load channels (${res.status})`);
      setBusy(false);
      return;
    }
    setChannels(res.data ?? []);
    setBusy(false);
  }

  useEffect(() => {
    if (canLoad) load();
  }, [canLoad]);

  async function createOrOpenSession(channelId: string) {
    if (!eventId) return;
    setCreatingFor(channelId);
    setError(null);

    const created = await sessionsApi.createSession(eventId, channelId);
    if (created.ok) {
      navigate(`/dashboard/${created.data.id}`);
      return;
    }

    // Common demo path: session already exists for this channel.
    if (created.status === 409) {
      const list = await sessionsApi.getSessions({ eventId, channelId, status: 'Active' });
      if (list.ok && Array.isArray(list.data) && list.data.length > 0) {
        const session = list.data[0] as Session;
        navigate(`/dashboard/${session.id}`);
        return;
      }
    }

    setError(created.error ?? `Failed to create session (${created.status})`);
    setCreatingFor(null);
  }

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ marginTop: 0, marginBottom: 0 }}>Channels</h2>
        <Link className="btn btn-secondary" to="/events">
          Back to events
        </Link>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: '0.75rem' }}>
        <div className="muted">Choose a channel to start a translator session.</div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={busy || !eventId}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!eventId ? (
        <div className="alert alert-error">Missing event ID.</div>
      ) : channels.length === 0 && !busy ? (
        <div className="muted" style={{ marginTop: '0.75rem' }}>
          No channels found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem' }}>
          {channels.map((c) => (
            <div key={c.id} className="card">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{c.name}</div>
                  <div className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <LanguageFlag languageCode={c.languageCode} title={getLanguageName(c.languageCode)} />
                    <span>{getLanguageName(c.languageCode) || c.languageCode}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => createOrOpenSession(c.id)}
                  disabled={creatingFor !== null}
                >
                  {creatingFor === c.id ? 'Starting…' : 'Start session'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

