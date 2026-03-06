import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as eventsApi from '../api/events';
import type { Event } from '../api/types';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    const res = await eventsApi.getEvents();
    if (!res.ok) {
      setError(res.error ?? `Failed to load events (${res.status})`);
      setBusy(false);
      return;
    }
    setEvents(res.data ?? []);
    setBusy(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Events</h2>

      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div className="muted">Select an event to pick a channel and start broadcasting.</div>
        <button type="button" className="btn btn-secondary" onClick={load} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {events.length === 0 && !busy && !error ? (
        <div className="muted">No events found.</div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {events.map((e) => (
            <Link
              key={e.id}
              to={`/events/${e.id}/channels`}
              className="card"
              style={{ display: 'block' }}
            >
              <div style={{ fontWeight: 800 }}>{e.name}</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {e.status}
                {e.description ? ` · ${e.description}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

