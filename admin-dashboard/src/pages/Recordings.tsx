import { useEffect, useState } from 'react';
import type { Recording } from '../api/types';
import * as recordingsApi from '../api/recordings';
import * as eventsApi from '../api/events';

export default function Recordings() {
  const [list, setList] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [events, setEvents] = useState<{ id: string; name: string }[]>([]);
  const [detail, setDetail] = useState<Recording | null>(null);
  const [modalDelete, setModalDelete] = useState<Recording | null>(null);

  const loadEvents = async () => {
    const res = await eventsApi.getEvents();
    if (res.ok && res.data) {
      setEvents(res.data.map((e) => ({ id: e.id, name: e.name })));
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await recordingsApi.getRecordings({
      eventId: eventId || undefined,
      sessionId: sessionId || undefined,
    });
    if (!res.ok) {
      setError(res.error ?? 'Failed to load recordings');
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
  }, [eventId, sessionId]);

  const handleDownload = async (r: Recording) => {
    try {
      const blob = await recordingsApi.downloadRecording(r.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = r.filePath.split(/[/\\]/).pop() ?? `recording-${r.id}.opus`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const handleDelete = async (id: string) => {
    const res = await recordingsApi.deleteRecording(id);
    if (res.ok) {
      setModalDelete(null);
      setDetail(null);
      load();
    } else {
      setError(res.error ?? 'Delete failed');
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>Recordings</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Event</label>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">All events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Session ID (filter)</label>
          <input
            type="text"
            placeholder="Optional session ID"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            style={{ minWidth: 200 }}
          />
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
                <th>Session ID</th>
                <th>Duration</th>
                <th>Started</th>
                <th>Ended</th>
                <th>Status</th>
                <th style={{ width: 160 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.id.slice(0, 8)}…</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{r.sessionId.slice(0, 8)}…</td>
                  <td>{r.durationSeconds}s</td>
                  <td>{new Date(r.startedAt).toLocaleString()}</td>
                  <td>{r.endedAt ? new Date(r.endedAt).toLocaleString() : '—'}</td>
                  <td>{r.status}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 4 }}
                      onClick={() => setDetail(r)}
                    >
                      Detail
                    </button>
                    {r.status === 'Completed' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginRight: 4 }}
                        onClick={() => handleDownload(r)}
                      >
                        Download
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setModalDelete(r)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.length === 0 && !loading && <p style={{ color: '#64748b' }}>No recordings found.</p>}
      {detail && (
        <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 100, minWidth: 360, maxWidth: 480 }}>
          <h2 style={{ marginTop: 0 }}>Recording detail</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
            <dt>ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.id}</dd>
            <dt>Session ID</dt>
            <dd style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>{detail.sessionId}</dd>
            <dt>File path</dt>
            <dd style={{ margin: 0, wordBreak: 'break-all' }}>{detail.filePath}</dd>
            <dt>Duration</dt>
            <dd style={{ margin: 0 }}>{detail.durationSeconds}s</dd>
            <dt>Started</dt>
            <dd style={{ margin: 0 }}>{new Date(detail.startedAt).toLocaleString()}</dd>
            <dt>Ended</dt>
            <dd style={{ margin: 0 }}>{detail.endedAt ? new Date(detail.endedAt).toLocaleString() : '—'}</dd>
            <dt>Status</dt>
            <dd style={{ margin: 0 }}>{detail.status}</dd>
          </dl>
          <div style={{ marginTop: '1rem', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {detail.status === 'Completed' && (
              <button type="button" className="btn btn-primary" onClick={() => handleDownload(detail)}>
                Download
              </button>
            )}
            <button type="button" className="btn btn-danger" onClick={() => setModalDelete(detail)}>
              Delete
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setDetail(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {modalDelete && (
        <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 101, minWidth: 320 }}>
          <h2 style={{ marginTop: 0 }}>Delete recording</h2>
          <p>Delete recording {modalDelete.id.slice(0, 8)}…? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setModalDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await handleDelete(modalDelete.id);
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
