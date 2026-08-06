import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { authApi } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import Seo from '../../components/Seo';

export default function Account() {
  const { customer, addresses, stats, refresh, logout } = useAuth();
  const { notify } = useCart();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ fullName: customer.fullName, phone: customer.phone || '' });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [address, setAddress] = useState({ label: 'Domicile', line1: '', city: 'Dakar', landmark: '' });
  const [busy, setBusy] = useState(null);

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      await fn();
      await refresh();
      notify(message);
      return true;
    } catch (err) {
      notify(err.message, 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <main>
      <Seo title="Mon compte" noindex />
      <header className="page-hero">
        <div className="container account-hero">
          <div>
            <p className="eyebrow">Mon compte</p>
            <h1>Bonjour, {customer.fullName.split(' ')[0]}.</h1>
            <p>{customer.email}</p>
          </div>
          <div className="account-stats">
            <div><strong>{stats?.orders ?? 0}</strong><span>Commande{(stats?.orders ?? 0) > 1 ? 's' : ''}</span></div>
            <div><strong>{formatPrice(stats?.spent ?? 0)}</strong><span>Total dépensé</span></div>
          </div>
        </div>
      </header>

      <div className="container account-layout">
        <nav className="account-nav" aria-label="Sections du compte">
          <Link to="/compte" className="active"><i className="far fa-user" aria-hidden="true" /> Profil</Link>
          <Link to="/compte/commandes"><i className="fas fa-box" aria-hidden="true" /> Mes commandes</Link>
          <Link to="/suivi"><i className="fas fa-truck" aria-hidden="true" /> Suivre une commande</Link>
          <button type="button" onClick={() => { logout(); navigate('/'); }}>
            <i className="fas fa-arrow-right-from-bracket" aria-hidden="true" /> Se déconnecter
          </button>
        </nav>

        <div className="account-content">
          {/* ------------------------------------------------------ Profil */}
          <section className="panel">
            <h2>Mes informations</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              run('profile', () => authApi.update(profile), 'Informations mises à jour.');
            }}>
              <div className="field">
                <label htmlFor="ac-name">Nom complet</label>
                <input id="ac-name" type="text" value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="ac-phone">Téléphone</label>
                <input id="ac-phone" type="tel" value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy === 'profile'}>
                {busy === 'profile' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          </section>

          {/* ---------------------------------------------------- Adresses */}
          <section className="panel">
            <h2>Mes adresses de livraison</h2>

            {addresses.length > 0 && (
              <div className="address-list">
                {addresses.map((a) => (
                  <div key={a.id} className="address-card">
                    <div>
                      <strong>{a.label}{a.is_default && <span className="tag-mini">Par défaut</span>}</strong>
                      <p>{a.line1}</p>
                      <span>{a.city}{a.landmark ? ` · ${a.landmark}` : ''}</span>
                    </div>
                    <button type="button" className="line-remove"
                      onClick={() => run('addr', () => authApi.removeAddress(a.id), 'Adresse supprimée.')}>
                      Supprimer
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run('newaddr',
                () => authApi.addAddress({ ...address, isDefault: addresses.length === 0 }),
                'Adresse ajoutée.');
              if (ok) setAddress({ label: 'Domicile', line1: '', city: 'Dakar', landmark: '' });
            }}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="ad-label">Nom de l'adresse</label>
                  <input id="ad-label" type="text" value={address.label}
                    onChange={(e) => setAddress({ ...address, label: e.target.value })} />
                </div>
                <div className="field">
                  <label htmlFor="ad-city">Ville</label>
                  <input id="ad-city" type="text" value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="ad-line">Adresse</label>
                <input id="ad-line" type="text" required placeholder="Quartier, rue, numéro"
                  value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="ad-mark">Repère (facultatif)</label>
                <input id="ad-mark" type="text" placeholder="En face de la pharmacie…"
                  value={address.landmark} onChange={(e) => setAddress({ ...address, landmark: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-ghost" disabled={busy === 'newaddr'}>
                <i className="fas fa-plus" aria-hidden="true" /> Ajouter cette adresse
              </button>
            </form>
          </section>

          {/* ------------------------------------------------ Mot de passe */}
          <section className="panel">
            <h2>Changer mon mot de passe</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const ok = await run('pass', () => authApi.password(passwords), 'Mot de passe modifié.');
              if (ok) setPasswords({ current: '', next: '' });
            }}>
              <div className="field">
                <label htmlFor="pw-cur">Mot de passe actuel</label>
                <input id="pw-cur" type="password" autoComplete="current-password" required
                  value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="pw-new">Nouveau mot de passe</label>
                <input id="pw-new" type="password" autoComplete="new-password" required minLength={8}
                  value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
                <p className="field-hint">8 caractères minimum.</p>
              </div>
              <button type="submit" className="btn btn-ghost" disabled={busy === 'pass'}>Modifier</button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
