import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice, imageUrl } from '../lib/format';

export default function Wishlist() {
  const { wishlist, toggleWishlist, isWishlistOpen, setIsWishlistOpen } = useCart();

  if (!isWishlistOpen) return null;
  const close = () => setIsWishlistOpen(false);

  return (
    <>
      <div className="drawer-backdrop" onClick={close} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Mes favoris">
        <div className="drawer-head">
          <div>
            <h2>Mes favoris</h2>
            <p>{wishlist.length} pièce{wishlist.length > 1 ? 's' : ''} sauvegardée{wishlist.length > 1 ? 's' : ''}</p>
          </div>
          <button type="button" className="icon-btn" onClick={close} aria-label="Fermer">
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="drawer-body">
          {wishlist.length === 0 ? (
            <div className="empty-state">
              <i className="far fa-heart" aria-hidden="true" />
              <h3>Aucun favori pour l'instant</h3>
              <p>Touchez le cœur sur une pièce pour la retrouver ici.</p>
              <Link to="/boutique" className="btn" onClick={close}>Parcourir la collection</Link>
            </div>
          ) : (
            wishlist.map((item) => (
              <div className="line-item" key={item.id}>
                <Link to={`/produit/${item.slug || item.id}`} className="line-thumb" onClick={close}>
                  <img src={imageUrl(item.image)} alt="" loading="lazy" />
                </Link>
                <div>
                  <div className="line-name">{item.name}</div>
                  <div className="line-meta">{item.category}</div>
                  <Link to={`/produit/${item.slug || item.id}`} className="btn btn-sm"
                    style={{ marginTop: 10 }} onClick={close}>
                    <i className="fas fa-bag-shopping" aria-hidden="true" /> Choisir la taille
                  </Link>
                </div>
                <div className="line-right">
                  <span className="line-price">{formatPrice(item.base_price)}</span>
                  <button type="button" className="line-remove" onClick={() => toggleWishlist(item)}>
                    Retirer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
