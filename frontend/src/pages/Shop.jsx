import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalog } from '../lib/api';
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard';
import Reveal from '../components/Reveal';
import Seo, { itemListJsonLd } from '../components/Seo';

const PER_PAGE = 12;

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const categorie = params.get('categorie') || '';
  const tri = params.get('tri') || 'pertinence';
  const enStock = params.get('stock') === '1';
  const [search, setSearch] = useState(params.get('q') || '');
  const [page, setPage] = useState(1);

  useEffect(() => { catalog.categories().then(setCategories).catch(() => {}); }, []);

  /* La saisie est temporisée : on n'interroge pas le serveur à chaque touche. */
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (search) next.set('q', search); else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => { setPage(1); }, [categorie, tri, enStock, params.get('q')]);

  useEffect(() => {
    let alive = true;
    if (page === 1) setLoading(true); else setLoadingMore(true);

    catalog.products({
      categorie, tri, q: params.get('q') || '',
      enStock: enStock ? 1 : '', page, limite: PER_PAGE,
    })
      .then((res) => {
        if (!alive) return;
        setError(null);
        setData((prev) => (page === 1 ? res : { ...res, items: [...prev.items, ...res.items] }));
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => { if (alive) { setLoading(false); setLoadingMore(false); } });

    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorie, tri, enStock, page, params.get('q')]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };

  const current = categories.find((c) => c.slug === categorie);
  const searchTerm = params.get('q') || '';

  const jsonLd = useMemo(
    () => (data.items.length ? itemListJsonLd(data.items) : null),
    [data.items]
  );

  /* Une recherche ou un tri ne crée pas une page à référencer : seules la
     collection complète et les catégories doivent remonter dans Google.
     Sans cela, « /boutique?q=robe » et « /boutique?tri=note » deviendraient
     autant de pages quasi identiques — du contenu dupliqué. */
  const isFacet = Boolean(searchTerm) || tri !== 'pertinence' || enStock;

  return (
    <main>
      <Seo
        title={current ? current.name : 'Toute la collection'}
        description={
          current
            ? `${current.description} — ${current.product_count} pièces disponibles chez Mojo Malado, Dakar. Livraison partout au Sénégal.`
            : "Robes, sacs, sandales et parfums choisis à la main au marché Sandaga, Dakar. Livraison 24h à Dakar, 48-72h en région."
        }
        image={current?.image}
        noindex={isFacet}
        jsonLd={jsonLd}
      />
      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Collection{current ? ` · ${current.name}` : ''}</p>
          <h1>{current ? current.name : 'Toute la collection'}</h1>
          <p>
            {current?.description ||
              'Robes, sacs, sandales et parfums choisis à la main dans notre boutique du marché Sandaga. Livraison partout au Sénégal.'}
          </p>
        </div>
      </header>

      <div className="container">
        <div className="shop-toolbar">
          <div className="search-field">
            <i className="fas fa-magnifying-glass" aria-hidden="true" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une robe, un sac, un parfum…" aria-label="Rechercher" />
          </div>

          <select className="select-field" value={tri} onChange={(e) => setParam('tri', e.target.value === 'pertinence' ? '' : e.target.value)}
            aria-label="Trier les produits">
            <option value="pertinence">Trier par : pertinence</option>
            <option value="nouveautes">Nouveautés</option>
            <option value="prix-asc">Prix croissant</option>
            <option value="prix-desc">Prix décroissant</option>
            <option value="note">Mieux notés</option>
          </select>

          <button type="button" className={`chip ${enStock ? 'active' : ''}`}
            onClick={() => setParam('stock', enStock ? '' : '1')} aria-pressed={enStock}>
            <i className="fas fa-check" aria-hidden="true" /> En stock
          </button>

          <div className="chip-row">
            <button type="button" className={`chip ${!categorie ? 'active' : ''}`}
              onClick={() => setParam('categorie', '')}>Tout</button>
            {/* Une catégorie vide n'est qu'un cul-de-sac pour la cliente ;
                elle reste visible dans l'administration. */}
            {categories.filter((c) => c.product_count > 0 || c.slug === categorie).map((c) => (
              <button key={c.id} type="button"
                className={`chip ${categorie === c.slug ? 'active' : ''}`}
                onClick={() => setParam('categorie', c.slug)}>
                {c.name} <span className="chip-count">{c.product_count}</span>
              </button>
            ))}
            <span className="result-count">
              {loading ? 'Chargement…' : `${data.total} article${data.total > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {error && (
          <div className="empty-state">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            <h3>Impossible de charger la collection</h3>
            <p>{error}</p>
            <button type="button" className="btn" onClick={() => setPage(1)}>Réessayer</button>
          </div>
        )}

        <div className="product-grid">
          {loading
            ? Array.from({ length: 8 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.items.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 60}><ProductCard product={p} /></Reveal>
              ))}
        </div>

        {!loading && !error && data.items.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-magnifying-glass" aria-hidden="true" />
            <h3>Aucun résultat</h3>
            <p>Essayez un autre mot-clé ou changez de catégorie.</p>
            <button type="button" className="btn" onClick={() => { setSearch(''); setParams({}, { replace: true }); }}>
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {!loading && page < data.pages && (
          <div className="load-more-wrap" style={{ marginBottom: 80 }}>
            <div className="progress-bar">
              <div style={{ width: `${(data.items.length / data.total) * 100}%` }} />
            </div>
            <span className="progress-label">{data.items.length} sur {data.total} articles</span>
            <button type="button" className="btn btn-ghost" disabled={loadingMore}
              onClick={() => setPage((p) => p + 1)}>
              {loadingMore ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Chargement…</> : 'Charger plus'}
            </button>
          </div>
        )}

        {!loading && page >= data.pages && data.items.length > 0 && <div style={{ height: 80 }} />}
      </div>
    </main>
  );
}
