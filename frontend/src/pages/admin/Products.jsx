import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatPrice, imageUrl } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

const FILTERS = [
  ['tous', 'Tous'],
  ['actifs', 'En ligne'],
  ['inactifs', 'Masqués'],
  ['stock-bas', 'Stock faible'],
  ['rupture', 'Rupture'],
];

export default function Products() {
  const [params, setParams] = useSearchParams();
  const { notify } = useCart();

  const statut = params.get('statut') || 'tous';
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.products({ statut, q: search })
      .then(setItems)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [statut, search, notify]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const remove = async (product) => {
    if (!window.confirm(`Retirer « ${product.name} » de la boutique ?`)) return;
    try {
      const res = await adminApi.deleteProduct(product.id);
      notify(res.message);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Produits & stock</h1>
          <p>{items.length} produit{items.length > 1 ? 's' : ''} affiché{items.length > 1 ? 's' : ''}</p>
        </div>
        <Link to="/gestion-mojo-privee/produits/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus" aria-hidden="true" /> Nouveau produit
        </Link>
      </header>

      <div className="admin-toolbar">
        <div className="search-field">
          <i className="fas fa-magnifying-glass" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit…" aria-label="Rechercher" />
        </div>
        <div className="chip-row" style={{ width: 'auto' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" className={`chip ${statut === id ? 'active' : ''}`}
              onClick={() => setParams(id === 'tous' ? {} : { statut: id }, { replace: true })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-tags" aria-hidden="true" />
          <h3>Aucun produit</h3>
          <p>Ajustez la recherche ou créez un nouveau produit.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Produit</th><th>Catégorie</th><th>Prix</th>
                <th>Stock</th><th>État</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <React.Fragment key={p.id}>
                  <tr>
                    <td>
                      <div className="cell-product">
                        <img src={imageUrl(p.image)} alt="" loading="lazy" />
                        <div>
                          <Link to={`/gestion-mojo-privee/produits/${p.id}`}>{p.name}</Link>
                          <span>{p.variant_count} déclinaison{p.variant_count > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </td>
                    <td>{p.category || '—'}</td>
                    <td>{formatPrice(p.base_price)}</td>
                    <td>
                      <button type="button" className="stock-badge"
                        onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        <span className={`status-pill ${p.stock === 0 ? 'bad' : p.stock <= 3 ? 'wait' : 'ok'}`}>
                          {p.stock}
                        </span>
                        <i className={`fas fa-chevron-${expanded === p.id ? 'up' : 'down'}`} aria-hidden="true" />
                      </button>
                    </td>
                    <td>
                      <span className={`status-pill ${p.is_active ? 'done' : ''}`}>
                        {p.is_active ? 'En ligne' : 'Masqué'}
                      </span>
                    </td>
                    <td className="cell-actions">
                      <Link to={`/gestion-mojo-privee/produits/${p.id}`} className="icon-btn" title="Modifier">
                        <i className="fas fa-pen" aria-hidden="true" />
                      </Link>
                      <button type="button" className="icon-btn danger" onClick={() => remove(p)} title="Retirer">
                        <i className="fas fa-trash" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="expand-row">
                      <td colSpan={6}><StockEditor productId={p.id} onSaved={load} /></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Réglage rapide du stock, sans quitter la liste. */
function StockEditor({ productId, onSaved }) {
  const { notify } = useCart();
  const [variants, setVariants] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    adminApi.product(productId)
      .then((p) => setVariants(p.variants))
      .catch((err) => notify(err.message, 'error'));
  }, [productId, notify]);

  if (!variants) return <p className="field-hint">Chargement des déclinaisons…</p>;

  const save = async (variant, stock) => {
    setSaving(variant.id);
    try {
      await adminApi.setStock(variant.id, stock);
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? { ...v, stock } : v)));
      notify('Stock mis à jour.');
      onSaved?.();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="stock-editor">
      {variants.map((v) => (
        <div key={v.id} className="stock-item">
          <span>{[v.size, v.color].filter(Boolean).join(' · ') || 'Taille unique'}</span>
          <div className="qty-picker small">
            <button type="button" disabled={saving === v.id || v.stock === 0}
              onClick={() => save(v, Math.max(0, v.stock - 1))} aria-label="Diminuer">
              <i className="fas fa-minus" aria-hidden="true" />
            </button>
            <span>{v.stock}</span>
            <button type="button" disabled={saving === v.id}
              onClick={() => save(v, v.stock + 1)} aria-label="Augmenter">
              <i className="fas fa-plus" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
