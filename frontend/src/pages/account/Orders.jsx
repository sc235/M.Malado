import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi } from '../../lib/api';
import { formatPrice, imageUrl } from '../../lib/format';
import Seo from '../../components/Seo';

const STATUS_CLASS = {
  en_attente: 'wait', confirmee: 'ok', preparation: 'ok',
  expediee: 'ok', livree: 'done', annulee: 'bad',
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    ordersApi.mine()
      .then(setOrders)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <Seo title="Mes commandes" noindex />
      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Mon compte</p>
          <h1>Mes commandes</h1>
          <p>Retrouvez l'historique de vos achats et suivez vos livraisons en cours.</p>
        </div>
      </header>

      <div className="container" style={{ paddingBlock: 40 }}>
        <nav className="account-nav horizontal" aria-label="Sections du compte">
          <Link to="/compte"><i className="far fa-user" aria-hidden="true" /> Profil</Link>
          <Link to="/compte/commandes" className="active"><i className="fas fa-box" aria-hidden="true" /> Mes commandes</Link>
          <Link to="/suivi"><i className="fas fa-truck" aria-hidden="true" /> Suivre une commande</Link>
        </nav>

        {loading && <div className="loader"><div className="loader-spinner" /></div>}

        {error && (
          <div className="empty-state">
            <i className="fas fa-triangle-exclamation" aria-hidden="true" />
            <h3>Chargement impossible</h3><p>{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-box-open" aria-hidden="true" />
            <h3>Aucune commande pour l'instant</h3>
            <p>Vos futures commandes apparaîtront ici.</p>
            <Link to="/boutique" className="btn">Découvrir la collection</Link>
          </div>
        )}

        <div className="order-list">
          {orders.map((o) => (
            <Link key={o.id} to={`/commande/${o.reference}`} className="order-row">
              <div className="order-thumb">
                {o.preview ? <img src={imageUrl(o.preview)} alt="" loading="lazy" />
                  : <i className="fas fa-box" aria-hidden="true" />}
              </div>
              <div className="order-main">
                <strong>{o.reference}</strong>
                <span>
                  {new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' · '}{o.item_count} article{o.item_count > 1 ? 's' : ''}
                </span>
              </div>
              <span className={`status-pill ${STATUS_CLASS[o.status] || ''}`}>{o.statusLabel}</span>
              <div className="order-total">
                <strong>{formatPrice(o.total)}</strong>
                {o.payment_status !== 'paye' && <span className="pay-warn">Paiement en attente</span>}
              </div>
              <i className="fas fa-chevron-right order-chevron" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
