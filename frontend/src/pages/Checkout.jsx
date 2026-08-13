import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, imageUrl } from '../lib/format';
import { ordersApi, SHOP, waLink } from '../lib/api';
import Seo from '../components/Seo';

/* ============================================================================
   Page de commande.

   Le tiroir latéral portait auparavant tout le tunnel d'achat. Sur un écran de
   téléphone, cela revenait à saisir son adresse et choisir son paiement dans
   une colonne de 320 pixels, sans jamais voir le détail de sa commande.
   Ici, le récapitulatif reste visible en permanence — c'est ce que fait
   n'importe quelle boutique en ligne sérieuse, et c'est ce qui rassure au
   moment de payer.
   ========================================================================== */

const METHODS = [
  { id: 'wave',         label: 'Wave',                    desc: 'Paiement instantané depuis votre application Wave', icon: 'fas fa-water',               cls: 'wave' },
  { id: 'orange_money', label: 'Orange Money',            desc: 'Payez depuis votre compte Orange Money',            icon: 'fas fa-mobile-screen',       cls: 'om' },
  { id: 'card',         label: 'Carte bancaire',          desc: 'Visa & Mastercard, authentification 3-D Secure',    icon: 'fas fa-credit-card',         cls: 'card' },
  { id: 'livraison',    label: 'Paiement à la livraison', desc: 'Réglez en espèces à la réception (Dakar)',          icon: 'fas fa-hand-holding-dollar', cls: 'cash' },
  { id: 'whatsapp',     label: 'Commander sur WhatsApp',  desc: 'On finalise ensemble par message',                  icon: 'fab fa-whatsapp',            cls: 'wa' },
];

const CITIES = ['Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Keur Massar', 'Thiès',
  'Mbour', 'Saint-Louis', 'Touba', 'Kaolack', 'Ziguinchor', 'Diourbel'];

const EMPTY = { name: '', phone: '', address: '', city: 'Dakar', note: '' };

export default function Checkout() {
  const {
    cart, subtotal, cartCount, shippingFor,
    removeFromCart, updateQuantity, clearCart, notify,
  } = useCart();
  const { customer, addresses } = useAuth();
  const navigate = useNavigate();

  const [info, setInfo] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState('wave');
  const [busy, setBusy] = useState(false);

  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null);      // { code, label, discount }
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState(null);

  /* Pré-remplissage depuis le compte connecté. */
  useEffect(() => {
    if (!customer) return;
    const fav = addresses.find((a) => a.is_default) || addresses[0];
    setInfo((prev) => ({
      ...prev,
      name: prev.name || customer.fullName || '',
      phone: prev.phone || customer.phone || '',
      address: prev.address || fav?.line1 || '',
      city: fav?.city || prev.city || 'Dakar',
    }));
  }, [customer, addresses]);

  const shipping = useMemo(() => shippingFor(info.city), [shippingFor, info.city]);
  const discount = promo?.discount || 0;
  const total = Math.max(0, subtotal + shipping - discount);

  /* Changer de ville modifie les frais de port : une remise « livraison
     offerte » calculée pour Dakar n'a plus le bon montant pour Thiès. */
  useEffect(() => {
    if (promo?.kind === 'shipping') setPromo(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.city]);

  /* Panier vidé (onglet parallèle, ou retour arrière après commande). */
  useEffect(() => {
    if (cart.length === 0 && !busy) navigate('/boutique', { replace: true });
  }, [cart.length, busy, navigate]);

  if (cart.length === 0) return null;

  const validate = () => {
    const next = {};
    if (info.name.trim().length < 3) next.name = 'Indiquez votre nom complet.';
    if (info.phone.replace(/\D/g, '').length < 9) next.phone = 'Numéro invalide (9 chiffres attendus).';
    if (info.address.trim().length < 5) next.address = 'Précisez votre adresse de livraison.';
    if (!info.city.trim()) next.city = 'Indiquez votre ville.';
    setErrors(next);

    if (Object.keys(next).length) {
      document.getElementById(`cf-${Object.keys(next)[0]}`)?.focus();
      return false;
    }
    return true;
  };

  /* ------------------------------------------------------------ Code promo */
  const applyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const res = await ordersApi.checkPromo(
        code,
        cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        info.city
      );
      setPromo(res);
      setPromoInput('');
      notify(`Code ${res.code} appliqué — ${res.label}`);
    } catch (err) {
      setPromoError(err.message);
      setPromo(null);
    } finally {
      setPromoBusy(false);
    }
  };

  const orderMessage = (reference, extra = '') => [
    'Bonjour Mojo Malado !',
    '',
    `Commande ${reference}`,
    `Nom : ${info.name}`,
    `Téléphone : ${info.phone}`,
    `Adresse : ${info.address}, ${info.city}`,
    info.note ? `Note : ${info.note}` : '',
    '',
    'Articles :',
    ...cart.map((l, i) =>
      `${i + 1}. ${l.name}${l.size ? ` · ${l.size}` : ''}${l.color ? ` · ${l.color}` : ''} × ${l.quantity}`),
    '',
    promo ? `Code promo : ${promo.code} (${promo.label})` : '',
    `Total : ${formatPrice(total)}`,
    extra,
  ].filter(Boolean).join('\n');

  /* ------------------------------------------------------------ Validation */
  const submit = async () => {
    if (!validate()) return;
    setBusy(true);

    try {
      /* Le serveur revérifie stock, prix et code promo : ce qui est envoyé
         ici n'est qu'une intention d'achat, jamais un montant à honorer. */
      const order = await ordersApi.create({
        items: cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        customerName: info.name,
        customerPhone: info.phone,
        customerEmail: customer?.email,
        addressLine: info.address,
        city: info.city,
        note: info.note,
        promoCode: promo?.code,
        paymentMethod: method,
      });

      const goToConfirmation = (state) => {
        clearCart();
        navigate(`/merci/${order.reference}`, {
          state: { phone: info.phone, order, ...state },
          replace: true,
        });
      };

      /* Modes sans paiement en ligne : on ouvre WhatsApp, la commande est
         déjà enregistrée et le stock réservé. */
      if (method === 'whatsapp' || method === 'livraison') {
        window.open(
          waLink(orderMessage(order.reference,
            method === 'livraison'
              ? 'Paiement : à la livraison.'
              : 'Paiement : à convenir avec le vendeur.')),
          '_blank', 'noopener'
        );
        goToConfirmation({});
        return;
      }

      /* Paiement en ligne. */
      try {
        const { checkout_url } = await ordersApi.pay(order.reference);
        clearCart();
        window.location.href = checkout_url;
      } catch {
        /* Aucun prestataire configuré : on bascule sur le transfert manuel.
           La commande existe, rien n'est perdu. */
        goToConfirmation({ manual: method });
      }
    } catch (err) {
      notify(err.message, 'error');
      /* 409 = stock devenu insuffisant, 404 = article retiré.
         Dans les deux cas le panier doit être revu avant de réessayer. */
      if (err.status === 409 || err.status === 404) {
        setPromo(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setBusy(false);
    }
  };

  const payable = METHODS.filter(
    (m) => m.id !== 'livraison' || /dakar|pikine|gu[ée]diawaye|rufisque|keur massar/i.test(info.city)
  );

  return (
    <main className="checkout">
      <Seo title="Votre commande" noindex />

      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link><span>/</span>
          <Link to="/boutique">Boutique</Link><span>/</span>
          <span style={{ color: 'var(--text-muted)' }}>Commande</span>
        </nav>

        <header className="checkout-head">
          <h1>Finaliser ma commande</h1>
          <p>
            {cartCount} article{cartCount > 1 ? 's' : ''} · Vos articles sont réservés
            le temps de la validation.
          </p>
        </header>

        <div className="checkout-grid">
          {/* ================================================== FORMULAIRE */}
          <div className="checkout-form">
            <section className="checkout-block">
              <h2><span className="step-num">1</span> Vos coordonnées</h2>

              {!customer && (
                <div className="inline-note">
                  <i className="fas fa-circle-info" aria-hidden="true" />
                  <span>
                    <Link to="/connexion" state={{ from: '/commande' }} className="link-underline">
                      Connectez-vous
                    </Link>{' '}
                    pour retrouver vos informations et suivre vos commandes.
                  </span>
                </div>
              )}

              <div className="field-row">
                <Field id="cf-name" label="Nom complet" error={errors.name}>
                  <input id="cf-name" type="text" autoComplete="name" placeholder="Ex : Awa Diop"
                    value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
                </Field>

                <Field id="cf-phone" label="Téléphone" error={errors.phone}
                  hint="Il servira à vous joindre pour la livraison.">
                  <input id="cf-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="77 123 45 67"
                    value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
                </Field>
              </div>
            </section>

            <section className="checkout-block">
              <h2><span className="step-num">2</span> Livraison</h2>

              <Field id="cf-address" label="Adresse" error={errors.address}>
                <input id="cf-address" type="text" autoComplete="street-address"
                  placeholder="Quartier, rue, point de repère"
                  value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} />
              </Field>

              <Field id="cf-city" label="Ville" error={errors.city}
                hint={shipping === 0 ? 'Livraison offerte' : `Frais de livraison : ${formatPrice(shipping)}`}>
                <input id="cf-city" type="text" autoComplete="address-level2" list="villes"
                  value={info.city} onChange={(e) => setInfo({ ...info, city: e.target.value })} />
                <datalist id="villes">
                  {CITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>

              <Field id="cf-note" label="Instructions de livraison (facultatif)">
                <textarea id="cf-note" rows="3"
                  placeholder="Horaire souhaité, précision sur l'adresse…"
                  value={info.note} onChange={(e) => setInfo({ ...info, note: e.target.value })} />
              </Field>

              {subtotal < SHOP.freeShippingFrom && shipping > 0 && (
                <p className="field-hint">
                  <i className="fas fa-truck" aria-hidden="true" />{' '}
                  Plus que {formatPrice(SHOP.freeShippingFrom - subtotal)} d'achat pour la livraison offerte.
                </p>
              )}
            </section>

            <section className="checkout-block">
              <h2><span className="step-num">3</span> Paiement</h2>

              <div className="pay-options">
                {payable.map((m) => (
                  <button key={m.id} type="button"
                    className={`pay-option ${method === m.id ? 'selected' : ''}`}
                    onClick={() => setMethod(m.id)} aria-pressed={method === m.id}>
                    <span className={`pay-logo ${m.cls}`}><i className={m.icon} aria-hidden="true" /></span>
                    <span>
                      <span className="pay-name">{m.label}</span>
                      <span className="pay-desc">{m.desc}</span>
                    </span>
                    <i className="fas fa-circle-check pay-check" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <p className="field-hint">
                <i className="fas fa-shield-halved" aria-hidden="true" />{' '}
                Aucune donnée bancaire n'est stockée sur ce site.
              </p>
            </section>
          </div>

          {/* =================================================== RÉCAPITULATIF */}
          <aside className="checkout-summary">
            <div className="summary-card">
              <h2>Votre commande</h2>

              <ul className="summary-items">
                {cart.map((line) => (
                  <li key={line.variantId} className="summary-item">
                    <Link to={`/produit/${line.slug || line.productId}`} className="summary-thumb">
                      <img src={imageUrl(line.image)} alt="" loading="lazy" />
                      <span className="summary-qty">{line.quantity}</span>
                    </Link>
                    <div className="summary-item-body">
                      <span className="summary-name">{line.name}</span>
                      <span className="summary-meta">
                        {[line.size, line.color].filter(Boolean).join(' · ') || 'Taille unique'}
                      </span>
                      <div className="summary-controls">
                        <button type="button" aria-label="Diminuer la quantité"
                          onClick={() => updateQuantity(line.variantId, line.quantity - 1)}>
                          <i className="fas fa-minus" aria-hidden="true" />
                        </button>
                        <span>{line.quantity}</span>
                        <button type="button" aria-label="Augmenter la quantité"
                          disabled={line.quantity >= line.stock}
                          onClick={() => updateQuantity(line.variantId, line.quantity + 1)}>
                          <i className="fas fa-plus" aria-hidden="true" />
                        </button>
                        <button type="button" className="summary-remove"
                          onClick={() => removeFromCart(line.variantId)}>Retirer</button>
                      </div>
                    </div>
                    <span className="summary-price">{formatPrice(line.price * line.quantity)}</span>
                  </li>
                ))}
              </ul>

              {/* ------------------------------------------------ Code promo */}
              <div className="promo-zone">
                {promo ? (
                  <div className="promo-applied">
                    <span>
                      <i className="fas fa-tag" aria-hidden="true" />{' '}
                      <strong>{promo.code}</strong> — {promo.label}
                    </span>
                    <button type="button" onClick={() => { setPromo(null); setPromoError(null); }}>
                      Retirer
                    </button>
                  </div>
                ) : (
                  <>
                    <label htmlFor="promo" className="promo-label">Code promo</label>
                    <div className="promo-row">
                      <input id="promo" type="text" placeholder="Ex : BIENVENUE10"
                        value={promoInput} autoComplete="off"
                        onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } }} />
                      <button type="button" className="btn btn-ghost btn-sm"
                        onClick={applyPromo} disabled={promoBusy || !promoInput.trim()}>
                        {promoBusy
                          ? <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                          : 'Appliquer'}
                      </button>
                    </div>
                    {promoError && <p className="field-msg">{promoError}</p>}
                  </>
                )}
              </div>

              {/* ---------------------------------------------------- Totaux */}
              <div className="summary-totals">
                <div className="summary-row">
                  <span>Sous-total</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="summary-row">
                  <span>Livraison · {info.city || '—'}</span>
                  <span>{shipping === 0 ? 'Offerte' : formatPrice(shipping)}</span>
                </div>
                {discount > 0 && (
                  <div className="summary-row is-discount">
                    <span>Remise · {promo.code}</span>
                    <span>−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="summary-total">
                  <span>Total</span><strong>{formatPrice(total)}</strong>
                </div>
              </div>

              <button type="button" className={`btn btn-block ${method === 'whatsapp' ? 'btn-wa' : 'btn-primary'}`}
                onClick={submit} disabled={busy}>
                {busy ? (
                  <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Enregistrement…</>
                ) : method === 'whatsapp' ? (
                  <><i className="fab fa-whatsapp" aria-hidden="true" /> Finaliser sur WhatsApp</>
                ) : method === 'livraison' ? (
                  <><i className="fas fa-check" aria-hidden="true" /> Valider ma commande</>
                ) : (
                  <><i className="fas fa-lock" aria-hidden="true" /> Payer {formatPrice(total)}</>
                )}
              </button>

              <Link to="/boutique" className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 10 }}>
                Continuer mes achats
              </Link>

              <ul className="summary-trust">
                <li><i className="fas fa-truck-fast" aria-hidden="true" /> Livraison 24h à Dakar</li>
                <li><i className="fas fa-rotate-left" aria-hidden="true" /> Échange sous 48h</li>
                <li><i className="fas fa-lock" aria-hidden="true" /> Paiement sécurisé</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ Champs */
function Field({ id, label, error, hint, children }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <p className="field-msg">{error}</p>}
      {!error && hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
