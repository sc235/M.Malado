import React, { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

const FILTERS = [
  ['', 'Toutes'],
  ['en_attente', 'À traiter'],
  ['confirmee', 'Confirmées'],
  ['preparation', 'En préparation'],
  ['expediee', 'En livraison'],
  ['livree', 'Livrées'],
  ['annulee', 'Annulées'],
];

const CLASS = {
  en_attente: 'wait', confirmee: 'ok', preparation: 'ok',
  expediee: 'ok', livree: 'done', annulee: 'bad',
};

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const { notify } = useCart();
  const statut = params.get('statut') || '';

  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  /* L'export reprend le filtre de statut affiché à l'écran, mais pas la
     recherche : on exporte une catégorie de commandes, pas un résultat. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      await adminApi.exportOrders(statut ? { statut } : {});
      notify('Export téléchargé.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    adminApi.orders({ statut, q: search })
      .then(setOrders)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [statut, search, notify]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Commandes</h1>
          <p>{orders.length} commande{orders.length > 1 ? 's' : ''} affichée{orders.length > 1 ? 's' : ''}</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm"
          onClick={exportCsv} disabled={exporting || orders.length === 0}>
          {exporting
            ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Export…</>
            : <><i className="fas fa-file-arrow-down" aria-hidden="true" /> Exporter en CSV</>}
        </button>
      </header>

      <div className="admin-toolbar">
        <div className="search-field">
          <i className="fas fa-magnifying-glass" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence, nom ou téléphone…" aria-label="Rechercher" />
        </div>
        <div className="chip-row" style={{ width: 'auto' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id || 'all'} type="button" className={`chip ${statut === id ? 'active' : ''}`}
              onClick={() => setParams(id ? { statut: id } : {}, { replace: true })}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="loader-spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-box-open" aria-hidden="true" />
          <h3>Aucune commande</h3>
          <p>Rien à afficher pour ce filtre.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Référence</th><th>Cliente</th><th>Ville</th>
                <th>Total</th><th>Paiement</th><th>Statut</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="clickable">
                  <td>
                    <Link to={`/gestion-mojo-privee/commandes/${o.id}`} className="cell-strong">
                      {o.reference}
                    </Link>
                    <span className="cell-sub">{o.item_count} article{o.item_count > 1 ? 's' : ''}</span>
                  </td>
                  <td>
                    {o.customer_name}
                    <span className="cell-sub">{o.customer_phone}</span>
                  </td>
                  <td>{o.city}</td>
                  <td className="cell-strong">{formatPrice(o.total)}</td>
                  <td>
                    <span className={`status-pill ${o.payment_status === 'paye' ? 'done' : o.payment_status === 'echoue' ? 'bad' : 'wait'}`}>
                      {o.payment_status === 'paye' ? 'Payé' : o.payment_status === 'echoue' ? 'Échoué' : 'En attente'}
                    </span>
                    <span className="cell-sub">{o.payment_method}</span>
                  </td>
                  <td><span className={`status-pill ${CLASS[o.status]}`}>{o.statusLabel}</span></td>
                  <td className="cell-sub">
                    {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
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
