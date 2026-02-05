import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as usersApi from '../api/users';
import * as eventsApi from '../api/events';
import * as sessionsApi from '../api/sessions';
import * as recordingsApi from '../api/recordings';

export default function Dashboard() {
  const [counts, setCounts] = useState<{
    users: number;
    events: number;
    activeSessions: number;
    recordings: number;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersRes, eventsRes, sessionsRes, recordingsRes] = await Promise.all([
          usersApi.getUsers(),
          eventsApi.getEvents(),
          sessionsApi.getSessions({ status: 'Active' }),
          recordingsApi.getRecordings(),
        ]);
        if (cancelled) return;
        const usersCount = usersRes.ok ? (usersRes.data?.length ?? 0) : 0;
        const eventsCount = eventsRes.ok ? (eventsRes.data?.length ?? 0) : 0;
        const sessionsCount = sessionsRes.ok ? (sessionsRes.data?.length ?? 0) : 0;
        const recordingsCount = recordingsRes.ok ? (recordingsRes.data?.length ?? 0) : 0;
        if (!eventsRes.ok && !sessionsRes.ok && !recordingsRes.ok) {
          setError('Failed to load dashboard data');
          return;
        }
        setCounts({
          users: usersCount,
          events: eventsCount,
          activeSessions: sessionsCount,
          recordings: recordingsCount,
        });
      } catch {
        if (!cancelled) setError('Failed to load dashboard data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Overview of the audio translation system.
      </p>
      {counts === null ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link to="/users" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{counts.users}</div>
              <div style={{ color: '#64748b' }}>Users</div>
            </div>
          </Link>
          <Link to="/events" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{counts.events}</div>
              <div style={{ color: '#64748b' }}>Events</div>
            </div>
          </Link>
          <Link to="/sessions" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{counts.activeSessions}</div>
              <div style={{ color: '#64748b' }}>Active Sessions</div>
            </div>
          </Link>
          <Link to="/recordings" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{counts.recordings}</div>
              <div style={{ color: '#64748b' }}>Recordings</div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
