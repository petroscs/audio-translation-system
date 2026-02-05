import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Channel, CreateChannelRequest, UpdateChannelRequest } from '../api/types';
import * as channelsApi from '../api/channels';
import * as eventsApi from '../api/events';
import type { Event } from '../api/types';

export default function EventChannels() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [list, setList] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | { edit: Channel } | { delete: Channel } | null>(null);

  const loadEvent = async () => {
    if (!eventId) return;
    const res = await eventsApi.getEvent(eventId);
    if (res.ok && res.data) setEvent(res.data);
    else setEvent(null);
  };

  const loadChannels = async () => {
    if (!eventId) return;
    const res = await channelsApi.getChannels(eventId);
    if (res.ok) setList(res.data ?? []);
    else setList([]);
  };

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    setError('');
    await Promise.all([loadEvent(), loadChannels()]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [eventId]);

  useEffect(() => {
    console.log('Modal state changed:', modal);
  }, [modal]);

  const handleCreate = async (body: CreateChannelRequest) => {
    if (!eventId) return { ok: false as const };
    const res = await channelsApi.createChannel(eventId, body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleUpdate = async (id: string, body: UpdateChannelRequest) => {
    const res = await channelsApi.updateChannel(id, body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await channelsApi.deleteChannel(id);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  if (!eventId) {
    return <div className="container">Invalid event</div>;
  }

  return (
    <div className="container">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/events" style={{ color: '#64748b', fontSize: '0.9rem' }}>← Events</Link>
      </div>
      <h1 style={{ marginTop: 0 }}>
        Channels {event ? `— ${event.name}` : ''}
      </h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#64748b' }}>Manage channels for this event.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            console.log('Create channel clicked, setting modal to create');
            setModal('create');
          }}
        >
          Create channel
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
                <th>Language code</th>
                <th>Created</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.languageCode}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 4 }}
                      onClick={() => setModal({ edit: c })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setModal({ delete: c })}
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
        <ModalBackdrop onClose={() => setModal(null)}>
          <ChannelForm
            onSave={handleCreate}
            onCancel={() => setModal(null)}
          />
        </ModalBackdrop>
      )}
      {modal && typeof modal === 'object' && 'edit' in modal && (
        <ModalBackdrop onClose={() => setModal(null)}>
          <ChannelForm
            channel={modal.edit}
            onSave={(body) => handleUpdate(modal.edit.id, body)}
            onCancel={() => setModal(null)}
          />
        </ModalBackdrop>
      )}
      {modal && typeof modal === 'object' && 'delete' in modal && (
        <ModalBackdrop onClose={() => setModal(null)}>
          <ConfirmModal
            title="Delete channel"
            message={`Delete channel "${modal.delete.name}"?`}
            onConfirm={() => handleDelete(modal.delete.id)}
            onCancel={() => setModal(null)}
          />
        </ModalBackdrop>
      )}
    </div>
  );
}

function ChannelForm({
  channel,
  onSave,
  onCancel,
}: {
  channel?: Channel;
  onSave: (body: CreateChannelRequest | UpdateChannelRequest) => Promise<{ ok: boolean; error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(channel?.name ?? '');
  const [languageCode, setLanguageCode] = useState(channel?.languageCode ?? 'en');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!channel;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await onSave({ name: name.trim(), languageCode: languageCode.trim() });
    setSaving(false);
    if (!res.ok) setError(res.error ?? 'Failed to save');
  };

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        minWidth: 320,
        maxWidth: 420,
        background: 'white',
        zIndex: 1001,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 style={{ marginTop: 0 }}>{isEdit ? 'Edit channel' : 'Create channel'}</h2>
      <form onSubmit={handleSubmit}>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-group">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
        </div>
        <div className="form-group">
          <label>Language code</label>
          <input value={languageCode} onChange={(e) => setLanguageCode(e.target.value)} required maxLength={20} />
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

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
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
    <div className="card" style={{ position: 'relative', minWidth: 320 }}>
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
