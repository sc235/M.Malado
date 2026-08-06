import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { catalog, SHOP, waLink } from '../lib/api';
import { formatPrice, imageUrl, starClasses } from '../lib/format';
import { useCart } from '../contexts/CartContext';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Seo, { productJsonLd, breadcrumbJsonLd } from '../components/Seo';
import Lightbox from '../components/Lightbox';
import SizeGuide from '../components/SizeGuide';

export default function Product() {
  const { key } = useParams();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist, setIsCartOpen, notify } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [color, setColor] = useState(null);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [tab, setTab] = useState('description');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    catalog.product(key)
      .then((data) => {
        if (!alive) return;
        setProduct(data);
        setColor(data.colors?.[0] ?? null);
        /* On présélectionne la première taille réellement disponible. */
        const firstAvailable = data.variants.find((v) => v.stock > 0);
        setSize(firstAvailable?.size ?? data.sizes?.[0] ?? null);
        setPhoto(0);
        setQty(1);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));

    window.scrollTo({ top: 0 });
    return () => { alive = false; };
  }, [key]);

  /* La variante courante = croisement de la couleur et de la taille choisies. */
  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find(
      (v) => (v.size ?? null) === (size ?? null) && (v.color ?? null) === (color ?? null)
    ) || product.variants.find((v) => (v.size ?? null) === (size ?? null)) || null;
  }, [product, size, color]);

  /* Données structurées : fiche produit + fil d'Ariane. C'est ce qui permet à
     Google d'afficher le prix, la disponibilité et les étoiles sous le lien.
     Mémorisé, sinon les balises seraient réécrites à chaque rendu. */
  const jsonLd = useMemo(() => {
    if (!product) return null;
    return [
      productJsonLd(product, variant?.price ?? product.base_price),
      breadcrumbJsonLd([
        { name: 'Accueil', path: '/' },
        { name: 'Boutique', path: '/boutique' },
        { name: product.category, path: `/boutique?categorie=${product.category_slug}` },
        { name: product.name, path: `/produit/${product.slug || product.id}` },
      ]),
    ];
  }, [product, variant]);

  const stockFor = (candidateSize) => {
    if (!product) return 0;
    const v = product.variants.find(
      (x) => (x.size ?? null) === (candidateSize ?? null) && (x.color ?? null) === (color ?? null)
    ) || product.variants.find((x) => (x.size ?? null) === (candidateSize ?? null));
    return v?.stock ?? 0;
  };

  if (loading) return <main className="loader"><div className="loader-spinner" /></main>;

  if (error || !product) {
    return (
      <main className="container" style={{ padding: '100px 0' }}>
        <div className="empty-state">
          <i className="fas fa-circle-question" aria-hidden="true" />
          <h3>Article introuvable</h3>
          <p>{error || "Cette pièce n'est plus disponible."}</p>
          <button type="button" className="btn" onClick={() => navigate('/boutique')}>
            Retour à la collection
          </button>
        </div>
      </main>
    );
  }

  const images = product.images?.length ? product.images : [{ url: product.image, alt: product.name }];
  const totalStock = Number(product.stock) || 0;
  const inStock = (variant?.stock ?? 0) > 0;
  const fav = isInWishlist(product.id);
  const price = variant?.price ?? product.base_price;

  const buyOnWhatsApp = () => {
    window.open(waLink([
      'Bonjour Mojo Malado !',
      '',
      `Je suis intéressée par : ${product.name}`,
      [size && `Taille : ${size}`, color && `Couleur : ${color}`].filter(Boolean).join('\n'),
      `Quantité : ${qty}`,
      `Prix : ${formatPrice(price)}`,
      '',
      'Est-il disponible ?',
    ].filter(Boolean).join('\n')), '_blank', 'noopener');
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: product.name, url }); return; } catch { /* annulé */ }
    }
    navigator.clipboard?.writeText(url);
    notify('Lien copié !');
  };

  return (
    <main>
      <Seo
        title={product.name}
        description={
          product.description
            ? `${product.description} — ${formatPrice(price)}. Livraison 24h à Dakar, partout au Sénégal.`
            : `${product.name} — ${formatPrice(price)}. Sélectionné à la main dans notre boutique de Sandaga, Dakar.`
        }
        image={images[0]?.url}
        jsonLd={jsonLd}
      />
      <div className="container">
        <nav className="breadcrumb" aria-label="Fil d'Ariane">
          <Link to="/">Accueil</Link><span>/</span>
          <Link to="/boutique">Boutique</Link><span>/</span>
          <Link to={`/boutique?categorie=${product.category_slug}`}>{product.category}</Link><span>/</span>
          <span style={{ color: 'var(--text-muted)' }}>{product.name}</span>
        </nav>

        <div className="product-page">
          {/* ------------------------------------------------------ Galerie */}
          <div>
            <button type="button" className="gallery-main" onClick={() => setZoomOpen(true)}
              aria-label="Agrandir la photo">
              <img src={imageUrl(images[photo]?.url)} alt={images[photo]?.alt || product.name} key={photo} />
              <span className="gallery-zoom-cue" aria-hidden="true">
                <i className="fas fa-magnifying-glass-plus" />
              </span>
            </button>
            {images.length > 1 && (
              <div className="gallery-thumbs">
                {images.map((img, i) => (
                  <button key={img.id || i} type="button"
                    className={`gallery-thumb ${i === photo ? 'active' : ''}`}
                    onClick={() => setPhoto(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={imageUrl(img.url)} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* -------------------------------------------------- Informations */}
          <div>
            <p className="pd-cat">{product.category}</p>
            <h1 className="pd-title">{product.name}</h1>

            <div className="product-rating" style={{ gap: 8 }}>
              <span style={{ display: 'inline-flex', gap: 2 }}>
                {starClasses(Number(product.rating) || 4.5).map((cls, i) => (
                  <i key={i} className={cls} aria-hidden="true" />
                ))}
              </span>
              <span>
                {Number(product.rating).toFixed(1)}
                {product.reviews.length > 0 && ` · ${product.reviews.length} avis`}
              </span>
            </div>

            <p className="pd-price">
              {formatPrice(price)}
              {product.compare_at > price && <s className="price-compare">{formatPrice(product.compare_at)}</s>}
            </p>

            <p className={`stock-line ${totalStock === 0 ? 'out' : totalStock <= 3 ? 'low' : 'ok'}`}>
              <i className={totalStock === 0 ? 'fas fa-circle-xmark' : 'fas fa-circle-check'} aria-hidden="true" />
              {totalStock === 0
                ? 'Épuisé — écrivez-nous pour être prévenue du réassort'
                : totalStock <= 3
                  ? `Plus que ${totalStock} exemplaire${totalStock > 1 ? 's' : ''} en stock`
                  : 'En stock, expédié sous 24h'}
            </p>

            {/* ------------------------------------------------- Couleurs */}
            {product.colors.length > 1 && (
              <div className="option-block">
                <div className="option-head">
                  <h4>Couleur</h4>
                  <span>{color}</span>
                </div>
                <div className="option-row">
                  {product.colors.map((c) => (
                    <button key={c} type="button"
                      className={`option-chip ${color === c ? 'active' : ''}`}
                      onClick={() => setColor(c)} aria-pressed={color === c}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------- Tailles */}
            {product.sizes.length > 0 && (
              <div className="option-block">
                <div className="option-head">
                  <h4>{product.category === 'Parfums' ? 'Contenance' : 'Taille'}</h4>
                  {variant && variant.stock > 0 && variant.stock <= 3 ? (
                    <span className="option-warn">Plus que {variant.stock} en {size}</span>
                  ) : product.category !== 'Parfums' ? (
                    /* La taille est la première cause de retour : le tableau
                       de correspondances doit être à portée de clic. */
                    <button type="button" className="size-guide-link" onClick={() => setGuideOpen(true)}>
                      <i className="fas fa-ruler" aria-hidden="true" /> Guide des tailles
                    </button>
                  ) : null}
                </div>
                <div className="option-row">
                  {product.sizes.map((s) => {
                    const stock = stockFor(s);
                    return (
                      <button key={s} type="button"
                        className={`option-chip ${size === s ? 'active' : ''} ${stock === 0 ? 'disabled' : ''}`}
                        onClick={() => stock > 0 && setSize(s)}
                        disabled={stock === 0}
                        aria-pressed={size === s}
                        title={stock === 0 ? 'Épuisé' : `${stock} en stock`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -------------------------------------------------- Actions */}
            <div className="pd-actions">
              <div className="qty-picker">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuer">
                  <i className="fas fa-minus" aria-hidden="true" />
                </button>
                <span>{qty}</span>
                <button type="button"
                  onClick={() => setQty((q) => Math.min(variant?.stock || 1, q + 1))}
                  disabled={qty >= (variant?.stock || 1)} aria-label="Augmenter">
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>

              <button type="button" className="btn btn-primary" disabled={!inStock}
                onClick={() => { if (addToCart(product, variant, qty)) setIsCartOpen(true); }}>
                <i className="fas fa-bag-shopping" aria-hidden="true" />
                {inStock ? 'Ajouter au panier' : 'Épuisé'}
              </button>
            </div>

            <div className="pd-actions" style={{ marginTop: 0 }}>
              <button type="button" className="btn btn-wa" onClick={buyOnWhatsApp}>
                <i className="fab fa-whatsapp" aria-hidden="true" /> Demander conseil
              </button>
              <button type="button" className="btn btn-ghost" style={{ flex: '0 0 auto' }}
                onClick={() => toggleWishlist(product)} aria-pressed={fav}>
                <i className={fav ? 'fas fa-heart' : 'far fa-heart'} aria-hidden="true" />
                {fav ? 'Dans vos favoris' : 'Favori'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ flex: '0 0 auto' }} onClick={share}>
                <i className="fas fa-share-nodes" aria-hidden="true" /> Partager
              </button>
            </div>

            <div className="trust-row">
              <span className="trust-item"><i className="fas fa-truck-fast" aria-hidden="true" /> Livraison 24h à Dakar</span>
              <span className="trust-item"><i className="fas fa-rotate-left" aria-hidden="true" /> Échange sous 48h</span>
              <span className="trust-item"><i className="fas fa-shield-halved" aria-hidden="true" /> Paiement sécurisé</span>
            </div>

            {/* --------------------------------------------------- Onglets */}
            <div className="tabs">
              {[
                ['description', 'Description'],
                ['livraison', 'Livraison'],
                ['avis', `Avis (${product.reviews.length})`],
              ].map(([id, label]) => (
                <button key={id} type="button"
                  className={`tab ${tab === id ? 'active' : ''}`}
                  onClick={() => setTab(id)}>{label}</button>
              ))}
            </div>

            <div className="tab-panel">
              {tab === 'description' && (
                <p>{product.description || "Pièce sélectionnée à la main dans notre boutique de Sandaga. Les couleurs peuvent légèrement varier selon votre écran."}</p>
              )}
              {tab === 'livraison' && (
                <>
                  <p>Livraison en 24h à Dakar ({formatPrice(SHOP.shippingDakar)}) et en 48–72h dans le reste du Sénégal ({formatPrice(SHOP.shippingRegions)}).</p>
                  <p style={{ marginTop: 10 }}>Livraison offerte à partir de {formatPrice(SHOP.freeShippingFrom)} d'achat. Échange possible sous 48h si l'article n'a pas été porté.</p>
                </>
              )}
              {tab === 'avis' && (
                product.reviews.length ? (
                  <div style={{ display: 'grid', gap: 16 }}>
                    {product.reviews.map((r) => (
                      <div key={r.id} className="mini-review">
                        <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                        <p>{r.body}</p>
                        <span>{r.author} · {new Date(r.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>Aucun avis publié pour le moment. Soyez la première à donner le vôtre après réception.</p>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <Lightbox images={images} index={photo} onChange={setPhoto} onClose={() => setZoomOpen(false)} />
      )}
      {guideOpen && (
        <SizeGuide category={product.category} onClose={() => setGuideOpen(false)} />
      )}

      {product.related?.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <Reveal className="section-head">
              <div>
                <p className="eyebrow">Vous aimerez aussi</p>
                <h2 className="section-title">Dans la même <em>veine</em></h2>
              </div>
              <Link to={`/boutique?categorie=${product.category_slug}`} className="link-underline">
                Voir tout <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </Reveal>
            <div className="product-grid">
              {product.related.map((p, i) => (
                <Reveal key={p.id} delay={i * 70}><ProductCard product={p} /></Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
