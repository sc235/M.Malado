import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import Seo from '../../components/Seo';

export default function Login() {
  const { login } = useAuth();
  const { notify } = useCart();
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
      const customer = await login(form);
      notify(`Bon retour, ${customer.fullName.split(' ')[0]} !`);
      navigate(location.state?.from || '/compte', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <Seo title="Connexion" noindex />
      <div className="auth-card">
        <p className="eyebrow">Mon compte</p>
        <h1>Bon retour parmi nous.</h1>
        <p className="auth-lede">
          Connectez-vous pour suivre vos commandes et retrouver vos informations de livraison.
        </p>

        {error && <div className="alert alert-error"><i className="fas fa-circle-exclamation" aria-hidden="true" /> {error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="lg-email">Adresse email</label>
            <input id="lg-email" type="email" autoComplete="email" required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="lg-pass">Mot de passe</label>
            <input id="lg-pass" type="password" autoComplete="current-password" required
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Connexion…</> : 'Se connecter'}
          </button>
        </form>

        <p className="auth-switch">
          Pas encore de compte ? <Link to="/inscription" className="link-underline">Créer un compte</Link>
        </p>
        <p className="auth-switch">
          Vous avez commandé sans compte ?{' '}
          <Link to="/suivi" className="link-underline">Suivre ma commande</Link>
        </p>
      </div>
    </main>
  );
}
