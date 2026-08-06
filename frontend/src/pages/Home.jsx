import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog, SHOP } from '../lib/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Seo, { siteOrigin } from '../components/Seo';

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [newest, setNewest] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      catalog.categories(),
      catalog.products({ vedette: 1, limite: 8, enStock: 1 }),
      catalog.products({ tri: 'nouveautes', limite: 4 }),
      /* Les avis ne doivent pas faire tomber la page s'ils échouent :
         le bandeau témoignages disparaît simplement. */
      catalog.reviews(3).catch(() => []),
    ])
      .then(([cats, feat, recent, latestReviews]) => {
        if (!alive) return;
        setCategories(cats);
        setFeatured(feat.items.length ? feat.items : recent.items);
        setNewest(recent.items);
        setProductCount(recent.total);
        setReviews(latestReviews);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  /* Signale à Google le champ de recherche interne : il peut alors proposer
     une barre de recherche du site directement dans ses résultats. */
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mojo Malado',
    url: siteOrigin(),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteOrigin()}/boutique?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }), []);

  return (
    <main>
      <Seo
        description="Robes en tissus d'exception, sacs de créateurs et parfums envoûtants, sélectionnés pièce par pièce au marché Sandaga à Dakar. Livraison 24h à Dakar, partout au Sénégal. Wave, Orange Money et carte bancaire."
        jsonLd={jsonLd}
      />
      {/* ------------------------------------------------------------- HÉROS */}
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">Dakar · Sandaga</p>
          <h1 className="hero-title">
            L'élégance africaine,<br />
            <em>portée avec fierté.</em>
          </h1>
          <p className="hero-sub">
            Robes en tissus d'exception, sacs de créateurs et parfums envoûtants —
            sélectionnés pièce par pièce dans notre boutique de la rue Thiong.
          </p>
          <div className="hero-actions">
            <Link to="/boutique" className="btn btn-lg">
              Découvrir la collection <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
            <a className="btn btn-ghost btn-lg" href={`https://wa.me/${SHOP.whatsapp}`}
              target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" aria-hidden="true" /> Nous écrire
            </a>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{productCount ?? '—'}</strong><span>Pièces disponibles</span>
            </div>
            <div className="hero-stat"><strong>24h</strong><span>Livraison Dakar</span></div>
            <div className="hero-stat"><strong>4.8/5</strong><span>Avis clientes</span></div>
          </div>
        </div>
        <div className="hero-visual">
          <img src="/robes.images/robeVertViolet.jpg" alt="" fetchPriority="high" />
        </div>
        <div className="scroll-cue">
          <span>Défiler</span><i className="fas fa-chevron-down" aria-hidden="true" />
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[0, 1].map((k) => (
            <span key={k}>
              Own your roots
              <span>Wear your culture</span>
              <span>Livraison partout au Sénégal</span>
              <span>Wave · Orange Money · Carte bancaire</span>
              <span>Pièces uniques</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------- VALEURS */}
      <div className="value-grid">
        {[
          { icon: 'fas fa-truck-fast', title: 'Livraison express', text: 'Dakar en 24h, partout au Sénégal en 48–72h.' },
          { icon: 'fas fa-hand-holding-heart', title: 'Sélection à la main', text: 'Chaque pièce est choisie et vérifiée en boutique.' },
          { icon: 'fas fa-shield-halved', title: 'Paiement sécurisé', text: 'Wave, Orange Money, carte bancaire ou à la livraison.' },
          { icon: 'fas fa-box-open', title: 'Suivi de commande', text: 'Vous savez à tout moment où en est votre colis.' },
        ].map((v) => (
          <div className="value-item" key={v.title}>
            <i className={v.icon} aria-hidden="true" />
            <h3>{v.title}</h3>
            <p>{v.text}</p>
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------- CATÉGORIES */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <div>
              <p className="eyebrow">Nos univers</p>
              <h2 className="section-title">Trouvez votre <em>signature</em></h2>
            </div>
            <Link to="/boutique" className="link-underline">
              Tout voir <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </Reveal>

          <div className="category-grid">
            {categories.filter((c) => c.product_count > 0).map((cat, i) => (
              <Reveal key={cat.id} delay={i * 90} className={i === 0 ? 'is-wide' : ''}>
                <Link to={`/boutique?categorie=${cat.slug}`} className="category-card">
                  <img src={cat.image || '/logo-modjo.jpg'} alt="" loading="lazy" />
                  <div className="category-body">
                    <h3>{cat.name}</h3>
                    <p>{cat.description} · {cat.product_count} pièces</p>
                    <span className="link-underline">Explorer</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- NOUVEAUTÉS */}
      {newest.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <Reveal className="section-head">
              <div>
                <p className="eyebrow">Derniers arrivages</p>
                <h2 className="section-title">Tout <em>juste</em> arrivé</h2>
              </div>
              <Link to="/boutique?tri=nouveautes" className="link-underline">
                Voir les nouveautés <i className="fas fa-arrow-right" aria-hidden="true" />
              </Link>
            </Reveal>
            <div className="product-grid">
              {newest.map((p, i) => (
                <Reveal key={p.id} delay={i * 70}>
                  <ProductCard product={p} badge={{ label: 'Nouveau', accent: true }} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- SÉLECTION */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head section-head-center">
            <p className="eyebrow">La sélection</p>
            <h2 className="section-title">Les pièces qu'on <em>adore</em></h2>
            <p className="section-desc">
              Nos coups de cœur du moment, choisis pour leur tissu, leur coupe et leur allure.
            </p>
          </Reveal>

          <div className="product-grid">
            {loading
              ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
              : featured.map((p, i) => (
                  <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard product={p} /></Reveal>
                ))}
          </div>

          <div className="load-more-wrap">
            <Link to="/boutique" className="btn btn-lg">
              Voir toute la collection <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- AVIS
          Vrais avis validés depuis le back-office. Tant qu'aucun n'est publié,
          la section ne s'affiche pas : mieux vaut rien que des faux. */}
      {reviews.length > 0 && (
        <section className="section section-alt">
          <div className="container">
            <Reveal className="section-head section-head-center">
              <p className="eyebrow">Elles nous font confiance</p>
              <h2 className="section-title">Ce qu'en disent <em>nos clientes</em></h2>
            </Reveal>
            <div className="review-grid">
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 90}>
                  <div className="review-card">
                    <div className="review-stars" aria-label={`${r.rating} sur 5`}>
                      {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                    </div>
                    <p className="review-text">« {r.body} »</p>
                    <div className="review-author">
                      <span className="review-avatar">{r.author.charAt(0)}</span>
                      <div>
                        <strong>{r.author}</strong>
                        <span>
                          {r.product_slug
                            ? <Link to={`/produit/${r.product_slug}`}>{r.product_name}</Link>
                            : 'Cliente vérifiée'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- MAISON */}
      <section className="section">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <Reveal>
            <p className="eyebrow">Notre maison</p>
            <h2 className="section-title" style={{ marginBottom: 20 }}>
              Née d'une passion pour <em>l'artisanat africain</em>
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.02rem', marginBottom: 16 }}>
              Au cœur du marché Sandaga, à Dakar, Mojo Malado réunit des vêtements de créateur,
              des sacs élégants et des parfums envoûtants. Chaque produit est choisi pour sa
              qualité, ses finitions et son charme authentique.
            </p>
            <p style={{
              fontFamily: 'var(--font-display)', fontStyle: 'italic',
              fontSize: '1.35rem', color: 'var(--primary)', margin: '28px 0',
            }}>
              « Own your roots, wear your culture. »
            </p>
            <Link to="/a-propos" className="btn btn-ghost">
              Lire notre histoire <i className="fas fa-arrow-right" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
