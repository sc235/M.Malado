import React, { useEffect, useState, useCallback } from 'react';
import { adminApi, waLink } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

export default function Customers() {
  const { notify } = useCart();
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.customers({ q: search })
      .then(setRows)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [search, notify]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Clientes</h1>
          <p>{rows.length} compte{rows.length > 1 ? 's' : ''} · classées par montant dépensé</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="search-field">
          <i className="fas fa-magnifying-glass" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email ou téléphone…" aria-label="Rechercher" />
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-users" aria-hidden="true" />
          <h3>Aucune cliente inscrite</h3>
          <p>Les comptes créés sur la boutique apparaîtront ici.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Cliente</th><th>Contact</th><th>Commandes</th><th>Total dépensé</th><th>Dernière commande</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span className="cell-strong">{c.full_name}</span>
                    <span className="cell-sub">
                      Inscrite le {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td>
                    <a href={`mailto:${c.email}`}>{c.email}</a>
                    <span className="cell-sub">{c.phone || '—'}</span>
                  </td>
                  <td>{c.orders}</td>
                  <td className="cell-strong">{formatPrice(c.spent)}</td>
                  <td className="cell-sub">
                    {c.last_order ? new Date(c.last_order).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="cell-actions">
                    {c.phone && (
                      <a className="icon-btn" title="Écrire sur WhatsApp" target="_blank" rel="noopener noreferrer"
                        href={waLink(`Bonjour ${c.full_name.split(' ')[0]} ! Ici Mojo Malado.`)}>
                        <i className="fab fa-whatsapp" aria-hidden="true" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
