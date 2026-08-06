import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';

const TABS = [['attente', 'En attente'], ['publies', 'Publiés'], ['tous', 'Tous']];

export default function Reviews() {
  const { notify } = useCart();
  const [tab, setTab] = useState('attente');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.reviews(tab)
      .then(setRows)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [tab, notify]);

  useEffect(load, [load]);

  const act = async (fn, message) => {
    try {
      await fn();
      notify(message);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Avis clientes</h1>
          <p>Un avis n'apparaît sur la boutique qu'une fois publié ici.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="chip-row" style={{ width: 'auto' }}>
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={`chip ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-star" aria-hidden="true" />
          <h3>Aucun avis</h3>
          <p>Rien à modérer pour ce filtre.</p>
        </div>
      ) : (
        <div className="review-mod-list">
          {rows.map((r) => (
            <article key={r.id} className="panel review-mod">
              <div className="review-mod-head">
                <div>
                  <div className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                  <strong>{r.author}</strong>
                  <span className="cell-sub">
                    {r.product_name || 'Produit supprimé'} ·{' '}
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <span className={`status-pill ${r.is_published ? 'done' : 'wait'}`}>
                  {r.is_published ? 'Publié' : 'En attente'}
                </span>
              </div>

              <p className="review-mod-body">{r.body}</p>

              <div className="review-mod-actions">
                {!r.is_published ? (
                  <button type="button" className="btn btn-primary btn-sm"
                    onClick={() => act(() => adminApi.moderateReview(r.id, true), 'Avis publié.')}>
                    <i className="fas fa-check" aria-hidden="true" /> Publier
                  </button>
                ) : (
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => act(() => adminApi.moderateReview(r.id, false), 'Avis dépublié.')}>
                    <i className="fas fa-eye-slash" aria-hidden="true" /> Dépublier
                  </button>
                )}
                <button type="button" className="btn btn-ghost btn-sm danger"
                  onClick={() => window.confirm('Supprimer définitivement cet avis ?')
                    && act(() => adminApi.deleteReview(r.id), 'Avis supprimé.')}>
                  <i className="fas fa-trash" aria-hidden="true" /> Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
