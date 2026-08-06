import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice, imageUrl } from '../lib/format';

export default function ProductCard({ product, badge }) {
  const { toggleWishlist, isInWishlist } = useCart();
  const fav = isInWishlist(product.id);
  const stock = Number(product.stock ?? 0);
  const soldOut = stock === 0;
  const lowStock = stock > 0 && stock <= 3;
  const rating = Number(product.rating) || 4.5;
  const to = `/produit/${product.slug || product.id}`;

  return (
    <article className={`product-card ${soldOut ? 'is-sold-out' : ''}`}>
      <div className="product-media">
        {soldOut ? (
          <span className="product-tag">Épuisé</span>
        ) : lowStock ? (
          <span className="product-tag tag-accent">Dernières pièces</span>
        ) : badge ? (
          <span className={`product-tag ${badge.accent ? 'tag-accent' : ''}`}>{badge.label}</span>
        ) : null}

        <button
          type="button"
          className={`fav-btn ${fav ? 'is-active' : ''}`}
          onClick={() => toggleWishlist(product)}
          aria-label={fav ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}
          aria-pressed={fav}
        >
          <i className={fav ? 'fas fa-heart' : 'far fa-heart'} aria-hidden="true" />
        </button>

        <Link to={to} aria-label={`Voir ${product.name}`}>
          <img src={imageUrl(product.image)} alt={product.name} loading="lazy" decoding="async" />
        </Link>

        <div className="product-quick">
          <Link to={to} className="quick-btn">
            <i className="fas fa-eye" aria-hidden="true" /> {soldOut ? 'Voir le produit' : 'Choisir la taille'}
          </Link>
        </div>
      </div>

      <div className="product-info">
        <span className="product-cat">{product.category}</span>
        <h3 className="product-name"><Link to={to}>{product.name}</Link></h3>
        <div className="product-foot">
          <span className="product-price">
            {formatPrice(product.base_price)}
            {product.compare_at > product.base_price && (
              <s className="price-compare">{formatPrice(product.compare_at)}</s>
            )}
          </span>
          <span className="product-rating">
            <i className="fas fa-star" aria-hidden="true" />{rating.toFixed(1)}
          </span>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '3 / 4' }} />
      <div style={{ paddingTop: 14 }}>
        <div className="skeleton skeleton-line" style={{ width: '35%' }} />
        <div className="skeleton skeleton-line" style={{ width: '80%', height: 16 }} />
        <div className="skeleton skeleton-line" style={{ width: '45%' }} />
      </div>
    </div>
  );
}
