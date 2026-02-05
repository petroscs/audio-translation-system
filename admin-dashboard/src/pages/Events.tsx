import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Event, CreateEventRequest, UpdateEventRequest } from '../api/types';
import * as eventsApi from '../api/events';

export default function Events() {
  const [list, setList] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | { edit: Event } | { delete: Event } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await eventsApi.getEvents();
    if (!res.ok) {
      setError(res.error ?? 'Failed to load events');
      setList([]);
    } else {
      setList(res.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (body: CreateEventRequest) => {
    const res = await eventsApi.createEvent(body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleUpdate = async (id: string, body: UpdateEventRequest) => {
    const res = await eventsApi.updateEvent(id, body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await eventsApi.deleteEvent(id);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleStart = async (id: string) => {
    const res = await eventsApi.startEvent(id);
    if (res.ok) load();
    return res;
  };

  const handleStop = async (id: string) => {
    const res = await eventsApi.stopEvent(id);
    if (res.ok) load();
    return res;
  };

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>Events</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#64748b' }}>Manage events and start/stop them.</p>
        <button type="button" className="btn btn-primary" onClick={() => setModal('create')}>
          Create event
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Start</th>
                <th>End</th>
                <th style={{ width: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.description ?? '—'}
                  </td>
                  <td>{e.status}</td>
                  <td>{e.startTime ? new Date(e.startTime).toLocaleString() : '—'}</td>
                  <td>{e.endTime ? new Date(e.endTime).toLocaleString() : '—'}</td>
                  <td>
                    <Link to={`/events/${e.id}/channels`} className="btn btn-secondary btn-sm" style={{ marginRight: 4 }}>
                      Channels
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 4 }}
                      onClick={() => setModal({ edit: e })}
                    >
                      Edit
                    </button>
                    {(e.status === 'Draft' || e.status === 'Scheduled' || e.status === 'Completed') && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        style={{ marginRight: 4 }}
                        onClick={() => handleStart(e.id)}
                      >
                        {e.status === 'Completed' ? 'Restart' : 'Start'}
                      </button>
                    )}
                    {e.status === 'Live' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ marginRight: 4 }}
                        onClick={() => handleStop(e.id)}
                      >
                        Stop
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setModal({ delete: e })}
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
      {modal === 'create' && (
        <EventForm
          onSave={handleCreate}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && 'edit' in modal && (
        <EventForm
          event={modal.edit}
          onSave={(body) => handleUpdate(modal.edit.id, body)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && 'delete' in modal && (
        <ConfirmModal
          title="Delete event"
          message={`Delete event "${modal.delete.name}"? This cannot be undone.`}
          onConfirm={() => handleDelete(modal.delete.id)}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

function EventForm({
  event: evt,
  onSave,
  onCancel,
}: {
  event?: Event;
  onSave: (body: CreateEventRequest | UpdateEventRequest) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(evt?.name ?? '');
  const [description, setDescription] = useState(evt?.description ?? '');
  const [startTime, setStartTime] = useState(
    evt?.startTime ? new Date(evt.startTime).toISOString().slice(0, 16) : ''
  );
  const [endTime, setEndTime] = useState(
    evt?.endTime ? new Date(evt.endTime).toISOString().slice(0, 16) : ''
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!evt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      endTime: endTime ? new Date(endTime).toISOString() : undefined,
    };
    const res = isEdit ? await onSave(body) : await onSave(body);
    setSaving(false);
    if (!res.ok) setError(res.error ?? 'Failed to save');
  };

  return (
    <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 100, minWidth: 360, maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? 'Edit event' : 'Create event'}</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} />
        </div>
        <div className="form-group">
          <label>Start time</label>
          <input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="form-group">
          <label>End time</label>
          <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };
  return (
    <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 100, minWidth: 320 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
