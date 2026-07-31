import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  deleteUser,
  getUser,
  updateUser,
  updateUserImage,
} from '../api/users';
import { Avatar } from '../components/Avatar';
import { Dialog } from '../components/Dialog';
import type { User } from '../types';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Person not found');
      return;
    }

    const userId = id;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getUser(userId);
        if (!active) {
          return;
        }
        setUser(data);
        setName(data.name);
        setEmail(data.email);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load user');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateUser(id, {
        name: name.trim(),
        email: email.trim(),
      });
      setUser(updated);
      setMessage('Details saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(fileList: FileList | null) {
    if (!id || !fileList?.[0]) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateUserImage(id, fileList[0]);
      setUser(updated);
      setMessage('Image updated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update image');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!id || !user) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await deleteUser(id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <p className="empty">Loading person…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Link className="back-link" to="/">
          ← Back to directory
        </Link>
        <p className="status error">{error ?? 'Person not found'}</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Link className="back-link" to="/">
        ← Back to directory
      </Link>

      <header className="brand">
        <h1>{user.name}</h1>
        <p>Update their details, replace their photo, or remove them from the roster.</p>
      </header>

      <div className="details-layout">
        <section className="panel image-panel">
          <Avatar user={user} size="lg" />
          <label className="btn btn-secondary file-input">
            {uploading ? 'Uploading…' : 'Update image'}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                void handleImageChange(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        </section>

        <section className="panel">
          <form className="form-grid" onSubmit={handleSave}>
            <h2 className="section-title">Details</h2>
            <div className="field">
              <label htmlFor="detail-name">Name</label>
              <input
                id="detail-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="detail-email">Email</label>
              <input
                id="detail-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => setDeleteOpen(true)}
                disabled={deleting}
              >
                Delete user
              </button>
            </div>
          </form>

          <dl className="meta">
            <dt>ID</dt>
            <dd>{user.id}</dd>
            <dt>Created</dt>
            <dd>{formatDate(user.createdAt)}</dd>
            <dt>Updated</dt>
            <dd>{formatDate(user.updatedAt)}</dd>
          </dl>
        </section>
      </div>

      {error ? (
        <p className="status error">{error}</p>
      ) : (
        <p className="status">{message}</p>
      )}

      <Dialog
        open={deleteOpen}
        title="Delete user"
        onClose={() => {
          if (!deleting) {
            setDeleteOpen(false);
          }
        }}
      >
        <p className="dialog-copy">
          Delete <strong>{user.name}</strong>? This cannot be undone.
        </p>
        <div className="actions dialog-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setDeleteOpen(false)}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            type="button"
            onClick={() => {
              void handleDeleteConfirm();
            }}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
