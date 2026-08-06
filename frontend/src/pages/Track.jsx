import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ordersApi, SHOP, waLink } from '../lib/api';
import { formatPrice, imageUrl } from '../lib/format';
import { useAuth } from '../contexts/AuthContext';
import Seo from '../components/Seo';

const STEPS = [
  { id: 'en_attente',  label: 'Commande reçue',      icon: 'fas fa-receipt' },
  { id: 'confirmee',   label: 'Confirmée',           icon: 'fas fa-circle-check' },
  { id: 'preparation', label: 'En préparation',      icon: 'fas fa-box-open' },
  { id: 'expediee',    label: 'En livraison',        icon: 'fas fa-truck-fast' },
  { id: 'livree',      label: 'Livrée',              icon: 'fas fa-house-circle-check' },
];

/**
 * Sert à la fois de page de confirmation (après commande) et de suivi public.
 * Sans référence dans l'URL, affiche le formulaire de recherche.
 */
export default function Track() {
  const { reference: refParam } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { customer } = useAuth();

  const [form, setForm] = useState({ reference: refParam || '', phone: params.get('tel') || '' });
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookup = useCallback(async (reference, phone) => {
    setLoading(true);
    setError(null);
    try {
      setOrder(await ordersApi.track(reference, phone));
    } catch (err) {
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (refParam) lookup(refParam, params.get('tel') || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refParam, customer]);

  /* --------------------------------------------------- Formulaire de recherche */
  if (!order && !loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">Suivi de commande</p>
          <h1>Où en est ma commande ?</h1>
          <p className="auth-lede">
            Saisissez la référence reçue à la validation (elle commence par MM)
            et le numéro de téléphone utilisé lors de la commande.
          </p>

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-circle-exclamation" aria-hidden="true" /> {error}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            navigate(`/commande/${form.reference.trim().toUpperCase()}?tel=${encodeURIComponent(form.phone)}`);
            lookup(form.reference.trim().toUpperCase(), form.phone);
          }}>
            <div className="field">
              <label htmlFor="tk-ref">Référence de commande</label>
              <input id="tk-ref" type="text" required placeholder="MM26-A1B2C3"
                value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tk-tel">Téléphone</label>
              <input id="tk-tel" type="tel" inputMode="tel" required placeholder="77 123 45 67"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              <i className="fas fa-magnifying-glass" aria-hidden="true" /> Suivre ma commande
            </button>
          </form>

          <p className="auth-switch">
            {customer
              ? <Link to="/compte/commandes" className="link-underline">Voir toutes mes commandes</Link>
              : <><Link to="/connexion" className="link-underline">Connectez-vous</Link> pour retrouver toutes vos commandes.</>}
          </p>
        </div>
      </main>
    );
  }

  if (loading) return <main className="loader"><div className="loader-spinner" /></main>;

  const cancelled = order.status === 'annulee';
  const currentIndex = STEPS.findIndex((s) => s.id === order.status);

  return (
    <main>
      <Seo title="Suivi de commande" noindex />
      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Commande {order.reference}</p>
          <h1>{cancelled ? 'Commande annulée' : order.statusLabel}</h1>
          <p>
            Passée le {new Date(order.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric',
            })} · {formatPrice(order.total)}
          </p>
        </div>
      </header>

      <div className="container" style={{ paddingBlock: 40 }}>
        {/* ------------------------------------------------------- Progression */}
        {!cancelled && (
          <div className="tracker">
            {STEPS.map((step, i) => (
              <div key={step.id}
                className={`tracker-step ${i < currentIndex ? 'done' : ''} ${i === currentIndex ? 'current' : ''}`}>
                <div className="tracker-dot"><i className={step.icon} aria-hidden="true" /></div>
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        )}

        {order.paymentStatus !== 'paye' && !cancelled && (
          <div className="alert alert-warn">
            <i className="fas fa-clock" aria-hidden="true" />
            <div>
              <strong>Paiement en attente</strong>
              <p>
                Envoyez {formatPrice(order.total)} au {SHOP.mobileMoneyDisplay} (Wave ou Orange Money),
                puis prévenez-nous sur WhatsApp avec votre référence.
              </p>
              <a className="btn btn-wa btn-sm" style={{ marginTop: 10 }}
                href={waLink(`Bonjour Mojo Malado ! J'ai réglé la commande ${order.reference} (${formatPrice(order.total)}). Voici ma preuve de paiement.`)}
                target="_blank" rel="noopener noreferrer">
                <i className="fab fa-whatsapp" aria-hidden="true" /> Envoyer ma preuve de paiement
              </a>
            </div>
          </div>
        )}

        <div className="track-grid">
          {/* --------------------------------------------------------- Articles */}
          <section className="panel">
            <h2>Articles</h2>
            {order.items.map((item, i) => (
              <div className="line-item" key={i}>
                <div className="line-thumb"><img src={imageUrl(item.image)} alt="" loading="lazy" /></div>
                <div>
                  <div className="line-name">{item.name}</div>
                  <div className="line-meta">
                    {[item.size, item.color].filter(Boolean).join(' · ') || 'Taille unique'} · ×{item.quantity}
                  </div>
                </div>
                <div className="line-right">
                  <span className="line-price">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
              </div>
            ))}

            <div className="summary-row" style={{ marginTop: 18 }}>
              <span>Sous-total</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Livraison</span><span>{order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span><strong>{formatPrice(order.total)}</strong>
            </div>
          </section>

          {/* ---------------------------------------------------------- Détails */}
          <div style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <section className="panel">
              <h2>Livraison</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
                <strong style={{ color: 'var(--text-main)' }}>{order.customerName}</strong><br />
                {order.addressLine}<br />{order.city}
              </p>
            </section>

            <section className="panel">
              <h2>Historique</h2>
              <ol className="timeline">
                {order.timeline.map((event, i) => (
                  <li key={i}>
                    <strong>{event.label}</strong>
                    {event.message && <p>{event.message}</p>}
                    <span>{new Date(event.created_at).toLocaleString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</span>
                  </li>
                ))}
              </ol>
            </section>

            <a className="btn btn-wa btn-block"
              href={waLink(`Bonjour Mojo Malado ! J'ai une question sur ma commande ${order.reference}.`)}
              target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" aria-hidden="true" /> Une question sur cette commande ?
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
