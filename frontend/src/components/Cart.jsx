import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice, imageUrl } from '../lib/format';
import { SHOP } from '../lib/api';

/* ============================================================================
   Tiroir panier.

   Il ne sert plus qu'à consulter et ajuster le panier : la saisie de l'adresse
   et le choix du paiement se font sur /commande, en pleine page. Un tunnel
   d'achat entier dans une colonne de 380 pixels décourageait la validation,
   surtout au téléphone.
   ========================================================================== */

export default function Cart() {
  const {
    cart, subtotal, cartCount, shippingFor,
    removeFromCart, updateQuantity, isCartOpen, setIsCartOpen,
  } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const close = () => setIsCartOpen(false);
  const shipping = shippingFor('Dakar');

  const checkout = () => {
    close();
    navigate('/commande');
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Panier">
        <div className="drawer-head">
          <div>
            <h2>Votre panier</h2>
            <p>{cartCount} article{cartCount > 1 ? 's' : ''}</p>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label="Fermer le panier">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-body">
          {cart.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-bag-shopping" aria-hidden="true" />
              <h3>Votre panier est vide</h3>
              <p>Découvrez nos robes, sacs et parfums sélectionnés à Dakar.</p>
              <Link to="/boutique" className="btn" onClick={close}>Voir la collection</Link>
            </div>
          ) : (
            <>
              {cart.map((line) => (
                <div className="line-item" key={line.variantId}>
                  <Link to={`/produit/${line.slug || line.productId}`} className="line-thumb" onClick={close}>
                    <img src={imageUrl(line.image)} alt="" loading="lazy" />
                  </Link>
                  <div>
                    <div className="line-name">{line.name}</div>
                    <div className="line-meta">
                      {[line.size, line.color].filter(Boolean).join(' · ') || 'Taille unique'}
                      {' — '}{formatPrice(line.price)}
                    </div>
                    <div className="line-qty">
                      <button type="button" aria-label="Diminuer"
                        onClick={() => updateQuantity(line.variantId, line.quantity - 1)}>
                        <i className="fas fa-minus" aria-hidden="true" />
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label="Augmenter"
                        disabled={line.quantity >= line.stock}
                        onClick={() => updateQuantity(line.variantId, line.quantity + 1)}>
                        <i className="fas fa-plus" aria-hidden="true" />
                      </button>
                    </div>
                    {line.quantity >= line.stock && (
                      <p className="field-hint">Stock maximum atteint ({line.stock}).</p>
                    )}
                  </div>
                  <div className="line-right">
                    <span className="line-price">{formatPrice(line.price * line.quantity)}</span>
                    <button type="button" className="line-remove"
                      onClick={() => removeFromCart(line.variantId)}>Retirer</button>
                  </div>
                </div>
              ))}

              {shipping > 0 && subtotal < SHOP.freeShippingFrom && (
                <p className="field-hint" style={{ marginTop: 18 }}>
                  <i className="fas fa-truck" aria-hidden="true" />{' '}
                  Plus que {formatPrice(SHOP.freeShippingFrom - subtotal)} pour la livraison offerte.
                </p>
              )}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-foot">
            <div className="summary-row">
              <span>Sous-total</span><span>{formatPrice(subtotal)}</span>
            </div>
            {/* Le montant définitif dépend de la ville et d'un éventuel code
                promo : il est calculé à l'étape suivante, pas ici. */}
            <p className="field-hint" style={{ marginTop: 2, marginBottom: 12 }}>
              Livraison et code promo calculés à l'étape suivante.
            </p>

            <button type="button" className="btn btn-primary btn-block" onClick={checkout}>
              Passer la commande <i className="fas fa-arrow-right" aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-ghost btn-block btn-sm"
              style={{ marginTop: 8 }} onClick={close}>
              Continuer mes achats
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
