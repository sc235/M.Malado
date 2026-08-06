import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { ordersApi, SHOP, waLink } from '../lib/api';
import { formatPrice, imageUrl } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import Seo from '../components/Seo';

/* ============================================================================
   Page de remerciement.

   Elle joue trois rôles : rassurer (la commande est bien passée), donner la
   référence, et — quand aucun prestataire de paiement n'est branché — afficher
   les instructions de transfert Wave / Orange Money.

   Les données viennent de l'état de navigation quand on arrive du tunnel
   d'achat, et sont retrouvées par l'API si la page est rechargée.
   ========================================================================== */

const METHOD_META = {
  wave:         { label: 'Wave',            icon: 'fas fa-water',               cls: 'wave', app: 'wave://' },
  orange_money: { label: 'Orange Money',    icon: 'fas fa-mobile-screen',       cls: 'om',   app: 'tel:%23144%23' },
  card:         { label: 'Carte bancaire',  icon: 'fas fa-credit-card',         cls: 'card', app: null },
  livraison:    { label: 'À la livraison',  icon: 'fas fa-hand-holding-dollar', cls: 'cash', app: null },
  whatsapp:     { label: 'Via WhatsApp',    icon: 'fab fa-whatsapp',            cls: 'wa',   app: null },
};

export default function Confirmation() {
  const { reference } = useParams();
  const { state } = useLocation();
  const { notify } = useCart();

  const phone = state?.phone || '';
  const manual = state?.manual || null;      // moyen de paiement à régler à la main

  const [order, setOrder] = useState(state?.order || null);
  const [loading, setLoading] = useState(!state?.order);

  /* Rechargement de la page : l'état de navigation est perdu, on redemande
     la commande à l'API. Sans le téléphone, le suivi refusera — on propose
     alors simplement le formulaire de suivi. */
  useEffect(() => {
    if (state?.order || !phone) { setLoading(false); return undefined; }
    let alive = true;
    ordersApi.track(reference, phone)
      .then((data) => alive && setOrder(data))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [reference, phone, state]);

  const meta = manual ? METHOD_META[manual] : null;
  const total = order?.total ?? 0;

  const message = useMemo(() => [
    'Bonjour Mojo Malado !',
    '',
    `Commande ${reference}`,
    meta ? `J'ai effectué le transfert ${meta.label} de ${formatPrice(total)} au ${SHOP.mobileMoneyDisplay}.` : '',
    'Voici la preuve de paiement :',
  ].filter(Boolean).join('\n'), [reference, meta, total]);

  const copyNumber = () => {
    navigator.clipboard?.writeText(SHOP.mobileMoney);
    notify('Numéro copié !');
  };

  return (
    <main className="confirmation">
      <Seo title={`Commande ${reference}`} noindex />

      <div className="container-narrow">
        <div className="confirm-hero">
          <span className="confirm-check" aria-hidden="true">
            <i className="fas fa-check" />
          </span>
          <p className="eyebrow">Merci pour votre confiance</p>
          <h1>Votre commande est enregistrée</h1>
          <p className="confirm-lead">
            Nous avons bien reçu votre commande. Un message de confirmation vous
            parviendra sur WhatsApp, et vos articles sont d'ores et déjà réservés.
          </p>

          <div className="confirm-ref">
            <span>Référence</span>
            <strong>{reference}</strong>
          </div>
        </div>

        {/* ------------------------------------------- Transfert à effectuer */}
        {meta && (
          <section className="confirm-pay">
            <div className="confirm-pay-head">
              <span className={`pay-logo ${meta.cls}`}><i className={meta.icon} aria-hidden="true" /></span>
              <div>
                <h2>Il reste une étape : le transfert {meta.label}</h2>
                <p>
                  Envoyez <strong>{formatPrice(total)}</strong> au numéro ci-dessous,
                  puis envoyez-nous la capture sur WhatsApp.
                </p>
              </div>
            </div>

            <div className="copy-box">
              <strong>{SHOP.mobileMoneyDisplay}</strong>
              <button type="button" className="icon-btn" onClick={copyNumber} aria-label="Copier le numéro">
                <i className="far fa-copy" aria-hidden="true" />
              </button>
            </div>

            <div className="confirm-pay-actions">
              {meta.app && (
                <a className="btn btn-ghost" href={meta.app}>
                  <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
                  Ouvrir {meta.label}
                </a>
              )}
              <a className="btn btn-wa" href={waLink(message)} target="_blank" rel="noopener noreferrer">
                <i className="fab fa-whatsapp" aria-hidden="true" /> J'ai payé — envoyer la preuve
              </a>
            </div>
          </section>
        )}

        {/* ------------------------------------------------- Récapitulatif */}
        {loading ? (
          <div className="loader"><div className="loader-spinner" /></div>
        ) : order ? (
          <section className="confirm-recap">
            <h2>Récapitulatif</h2>

            <ul className="summary-items">
              {(order.items || []).map((item, i) => (
                <li key={i} className="summary-item">
                  <span className="summary-thumb">
                    <img src={imageUrl(item.image)} alt="" loading="lazy" />
                    <span className="summary-qty">{item.quantity}</span>
                  </span>
                  <div className="summary-item-body">
                    <span className="summary-name">{item.name}</span>
                    <span className="summary-meta">
                      {[item.size, item.color].filter(Boolean).join(' · ') || 'Taille unique'}
                    </span>
                  </div>
                  <span className="summary-price">
                    {formatPrice((item.unit_price ?? item.price) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="summary-totals">
              <div className="summary-row">
                <span>Sous-total</span><span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Livraison{order.city ? ` · ${order.city}` : ''}</span>
                <span>{order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)}</span>
              </div>
              {order.discount > 0 && (
                <div className="summary-row is-discount">
                  <span>Remise{order.promoCode ? ` · ${order.promoCode}` : ''}</span>
                  <span>−{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="summary-total">
                <span>Total</span><strong>{formatPrice(order.total)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {/* ------------------------------------------------------ Et ensuite */}
        <section className="confirm-next">
          <h2>Et maintenant ?</h2>
          <ol className="confirm-steps">
            <li>
              <strong>Nous vous appelons</strong>
              <span>Pour confirmer votre commande et convenir de la livraison.</span>
            </li>
            <li>
              <strong>Préparation</strong>
              <span>Vos articles sont vérifiés et emballés avec soin.</span>
            </li>
            <li>
              <strong>Livraison</strong>
              <span>24h à Dakar, 48 à 72h dans le reste du Sénégal.</span>
            </li>
          </ol>

          <div className="confirm-actions">
            <Link to={`/commande/${reference}${phone ? `?tel=${encodeURIComponent(phone)}` : ''}`} className="btn">
              <i className="fas fa-box-open" aria-hidden="true" /> Suivre ma commande
            </Link>
            <Link to="/boutique" className="btn btn-ghost">
              Continuer mes achats <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>

          <p className="field-hint" style={{ textAlign: 'center', marginTop: 22 }}>
            Une question ? Écrivez-nous sur WhatsApp au{' '}
            <a className="link-underline" href={waLink(`Bonjour, à propos de ma commande ${reference}…`)}
              target="_blank" rel="noopener noreferrer">{SHOP.whatsappDisplay}</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
