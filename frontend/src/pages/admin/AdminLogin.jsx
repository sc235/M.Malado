import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { adminApi, setToken } from '../../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await adminApi.login(form);
      setToken(data.token, 'admin');
      navigate(location.state?.from || '/gestion-mojo-privee', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page admin-login">
      <div className="auth-card">
        <img src="/logo-modjo.jpg" alt="" style={{ width: 56, borderRadius: 12, marginBottom: 18 }} />
        <p className="eyebrow">Espace privé</p>
        <h1>Administration</h1>
        <p className="auth-lede">Gestion du catalogue, des stocks et des commandes.</p>

        {error && <div className="alert alert-error"><i className="fas fa-lock" aria-hidden="true" /> {error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="ad-email">Email</label>
            <input id="ad-email" type="email" autoComplete="username" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ad-pass">Mot de passe</label>
            <input id="ad-pass" type="password" autoComplete="current-password" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Connexion…</> : 'Entrer'}
          </button>
        </form>

        <p className="field-hint" style={{ textAlign: 'center', marginTop: 18 }}>
          Cinq tentatives maximum par quart d'heure.
        </p>
      </div>
    </main>
  );
}
