import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Seo from '../../components/Seo';

export default function Register() {
  const { register } = useAuth();
  const { notify } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState({});

  const strength = (() => {
    const p = form.password;
    if (p.length < 8) return { level: 0, label: '8 caractères minimum' };
    let score = 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return { level: score, label: ['', 'Faible', 'Correct', 'Bon', 'Excellent'][score] };
  })();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDetails({});
    try {
      const customer = await register(form);
      notify(`Bienvenue, ${customer.fullName.split(' ')[0]} !`);
      navigate('/compte', { replace: true });
    } catch (err) {
      setError(err.message);
      setDetails(err.details || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <Seo title="Créer un compte" noindex />
      <div className="auth-card">
        <p className="eyebrow">Rejoindre le cercle</p>
        <h1>Créer mon compte.</h1>
        <p className="auth-lede">
          Suivez vos commandes, enregistrez vos adresses et gagnez du temps à chaque achat.
        </p>

        {error && <div className="alert alert-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {error}</div>}

        <form onSubmit={submit}>
          <div className={`field ${details.fullName ? 'has-error' : ''}`}>
            <label htmlFor="rg-name">Nom complet</label>
            <input id="rg-name" type="text" autoComplete="name" required placeholder="Ex : Awa Diop"
              value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            {details.fullName && <p className="field-msg">{details.fullName}</p>}
          </div>

          <div className={`field ${details.email ? 'has-error' : ''}`}>
            <label htmlFor="rg-email">Adresse email</label>
            <input id="rg-email" type="email" autoComplete="email" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {details.email && <p className="field-msg">{details.email}</p>}
          </div>

          <div className={`field ${details.phone ? 'has-error' : ''}`}>
            <label htmlFor="rg-phone">Téléphone</label>
            <input id="rg-phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="77 123 45 67"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            {details.phone
              ? <p className="field-msg">{details.phone}</p>
              : <p className="field-hint">Utilisé pour la livraison et le suivi de vos commandes.</p>}
          </div>

          <div className={`field ${details.password ? 'has-error' : ''}`}>
            <label htmlFor="rg-pass">Mot de passe</label>
            <input id="rg-pass" type="password" autoComplete="new-password" required minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <div className="strength">
              <div className="strength-track">
                <div className={`strength-fill lvl-${strength.level}`} style={{ width: `${strength.level * 25}%` }} />
              </div>
              <span>{strength.label}</span>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Création…</> : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-switch">
          Déjà cliente ? <Link to="/connexion" className="link-underline">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
