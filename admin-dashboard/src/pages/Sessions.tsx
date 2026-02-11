import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Session } from '../api/types';
import * as sessionsApi from '../api/sessions';
import * as eventsApi from '../api/events';

export default function Sessions() {
  const [list, setList] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Active');
  const [eventId, setEventId] = useState<string>('');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [detail, setDetail] = useState<Session | null>(null);

  const loadEvents = async () => {
    const res = await eventsApi.getEvents();
    if (res.ok && res.data) {
      setEvents(res.data.map((e) => ({ id: e.id, name: e.name })));
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await sessionsApi.getSessions({
      eventId: eventId || undefined,
      status: filterStatus || undefined,
    });
    if (!res.ok) {
      setError(res.error ?? 'Failed to load sessions');
      setList([]);
    } else {
      setList(res.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    load();
  }, [filterStatus, eventId]);

  const handleEndSession = async (id: string) => {
    const res = await sessionsApi.endSession(id);
    if (res.ok) {
      setDetail(null);
      load();
    }
    return res;
  };

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>Sessions</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Ended">Ended</option>
            <option value="Disconnected">Disconnected</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Event</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Event ID</th>
                <th>Channel ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Started</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.id.slice(0, 8)}…</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.userId.slice(0, 8)}…</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.eventId.slice(0, 8)}…</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{s.channelId.slice(0, 8)}…</td>
                  <td>{s.role}</td>
                  <td>{s.status}</td>
                  <td>{new Date(s.startedAt).toLocaleString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 4 }}
                      onClick={() => setDetail(s)}
                    >
                      Detail
                    </button>
                    {s.status === 'Active' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleEndSession(s.id)}
                      >
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length === 0 && !loading && <p style={{ color: '#64748b' }}>No sessions found.</p>}
      {detail && (
        <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 100, minWidth: 360, maxWidth: 480 }}>
          <h2 style={{ marginTop: 0 }}>Session detail</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
            <dt>ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.id}</dd>
            <dt>User ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.userId}</dd>
            <dt>Event ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.eventId}</dd>
            <dt>Channel ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.channelId}</dd>
            <dt>Role</dt>
            <dd style={{ margin: 0 }}>{detail.role}</dd>
            <dt>Status</dt>
            <dd style={{ margin: 0 }}>{detail.status}</dd>
            <dt>Started</dt>
            <dd style={{ margin: 0 }}>{new Date(detail.startedAt).toLocaleString()}</dd>
            {detail.endedAt && (
              <>
                <dt>Ended</dt>
                <dd style={{ margin: 0 }}>{new Date(detail.endedAt).toLocaleString()}</dd>
              </>
            )}
          </dl>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#64748b' }}>Listeners: scan to join</p>
            <QRCodeSVG value={detail.id} size={160} level="M" />
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {detail.status === 'Active' && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  await handleEndSession(detail.id);
                }}
              >
                End session
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
