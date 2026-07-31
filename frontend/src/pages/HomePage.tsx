import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { createUser, listUsers } from '../api/users';
import { Avatar } from '../components/Avatar';
import { Dialog } from '../components/Dialog';
import type { User } from '../types';

export function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  function openDialog() {
    setName('');
    setEmail('');
    setFormError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (saving) {
      return;
    }
    setDialogOpen(false);
    setFormError(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim()) {
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const user = await createUser({ name: name.trim(), email: email.trim() });
      setUsers((current) => [...current, user]);
      setDialogOpen(false);
      setName('');
      setEmail('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to create user',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="brand">
        <h1>People Desk</h1>
        <p>
          Browse everyone on the roster, then open a person to edit details or
          their photo.
        </p>
      </header>

      <div className="stack">
        <section className="panel">
          <div className="section-bar">
            <h2 className="section-title">Directory</h2>
            <button
              className="btn btn-primary"
              type="button"
              onClick={openDialog}
            >
              Add user
            </button>
          </div>

          {loading ? <p className="empty">Loading people…</p> : null}
          {!loading && users.length === 0 ? (
            <p className="empty">
              No people yet. Add the first one to get started.
            </p>
          ) : null}

          {!loading && users.length > 0 ? (
            <ul className="user-list">
              {users.map((user) => (
                <li key={user.id}>
                  <Link className="user-row" to={`/users/${user.id}`}>
                    <Avatar user={user} />
                    <span>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </span>
                    <span className="chevron" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {error ? (
          <p className="status error">{error}</p>
        ) : (
          <p className="status" />
        )}
      </div>

      <Dialog
        open={dialogOpen}
        title="Add user"
        size="lg"
        onClose={closeDialog}
      >
        <form className="stack dialog-form" onSubmit={handleCreate}>
          <div className="dialog-fields">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Full name"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </div>
          </div>
          {formError ? <p className="status error">{formError}</p> : null}
          <div className="actions dialog-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={closeDialog}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
