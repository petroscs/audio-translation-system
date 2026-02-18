import { useEffect, useState } from 'react';
import type { User, CreateUserRequest, UpdateUserRequest } from '../api/types';
import type { UserRole } from '../api/types';
import * as usersApi from '../api/users';

export default function Users() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | { edit: User } | { delete: User } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const load = async () => {
    setLoading(true);
    setError('');
    const res = await usersApi.getUsers();
    if (!res.ok) {
      setError(res.status === 403 ? 'Admin access required' : res.error ?? 'Failed to load users');
      setList([]);
    } else {
      setList(res.data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (body: CreateUserRequest) => {
    const res = await usersApi.createUser(body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleUpdate = async (id: string, body: UpdateUserRequest) => {
    const res = await usersApi.updateUser(id, body);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  const handleDelete = async (id: string) => {
    const res = await usersApi.deleteUser(id);
    if (res.ok) {
      setModal(null);
      load();
    }
    return res;
  };

  return (
    <div className="container">
      <h1 style={{ marginTop: 0 }}>Users</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, color: '#64748b' }}>Manage users and roles.</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setFormKey(k => k + 1);
            setModal('create');
          }}
        >
          Create user
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginRight: 4 }}
                      onClick={() => setModal({ edit: u })}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setModal({ delete: u })}
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
        <UserForm
          key={`create-${formKey}`}
          user={undefined}
          onSave={async (body) => handleCreate(body as CreateUserRequest)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && 'edit' in modal && (
        <UserForm
          key={`edit-${modal.edit.id}`}
          user={modal.edit}
          onSave={(body) => handleUpdate(modal.edit.id, body)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal && typeof modal === 'object' && 'delete' in modal && (
        <ConfirmModal
          title="Delete user"
          message={`Delete user "${modal.delete.username}"? This cannot be undone.`}
          onConfirm={() => { void handleDelete(modal.delete.id); }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

function UserForm({
  user,
  onSave,
  onCancel,
}: {
  user?: User;
  onSave: (body: CreateUserRequest | UpdateUserRequest) => Promise<{ ok: boolean; error?: string } | { data?: unknown; ok: true }>;
  onCancel: () => void;
}) {
  const isEdit = !!user;
  
  // Initialize state - if user is provided, use their data, otherwise empty
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'Listener');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form whenever user prop changes - this runs on mount and when user changes
  useEffect(() => {
    // Only update if user prop actually changed to avoid unnecessary resets
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setRole(user.role);
      setPassword('');
    } else {
      // Explicitly reset to empty for create mode
      setUsername('');
      setEmail('');
      setRole('Listener');
      setPassword('');
    }
    setError('');
    setSaving(false);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = isEdit
      ? await onSave({ username: username.trim() || undefined, email: email.trim() || undefined, role, password: password || undefined })
      : await onSave({ username: username.trim(), email: email.trim(), role, password });
    setSaving(false);
    if (!res.ok) setError(res.error ?? 'Failed to save');
  };

  return (
    <div className="card" style={{ position: 'fixed', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 100, minWidth: 320, maxWidth: 420 }}>
      <h2 style={{ marginTop: 0 }}>{isEdit ? 'Edit user' : 'Create user'}</h2>
      <form onSubmit={handleSubmit} autoComplete="off">
        {error && <div className="alert alert-error">{error}</div>}
        {/* Hidden inputs to prevent browser autofill */}
        {!isEdit && (
          <>
            <input type="text" style={{ display: 'none' }} tabIndex={-1} autoComplete="username" />
            <input type="password" style={{ display: 'none' }} tabIndex={-1} autoComplete="current-password" />
          </>
        )}
        <div className="form-group">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required={!isEdit}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            name={isEdit ? `username-${user?.id}` : 'new-username'}
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required={!isEdit}
            autoComplete="off"
            name={isEdit ? `email-${user?.id}` : 'new-email'}
          />
        </div>
        <div className="form-group">
          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="Admin">Admin</option>
            <option value="Translator">Translator</option>
            <option value="Listener">Listener</option>
          </select>
        </div>
        <div className="form-group">
          <label>Password {isEdit && '(leave blank to keep current)'}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required={!isEdit}
            autoComplete={isEdit ? 'current-password' : 'new-password'}
            name={isEdit ? `password-${user?.id}` : 'new-password'}
          />
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
