import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import RevenueChart from '../../components/charts/RevenueChart';
import TopProductsChart from '../../components/charts/TopProductsChart';

const STATUS_ORDER = [
  ['en_attente', 'À traiter', 'wait'],
  ['confirmee', 'Confirmées', 'ok'],
  ['preparation', 'En préparation', 'ok'],
  ['expediee', 'En livraison', 'ok'],
  ['livree', 'Livrées', 'done'],
  ['annulee', 'Annulées', 'bad'],
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.stats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="admin-page">
        <div className="empty-state">
          <i className="fas fa-triangle-exclamation" aria-hidden="true" />
          <h3>Chargement impossible</h3><p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="loader"><div className="loader-spinner" /></div>;

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Tableau de bord</h1>
          <p>Vue d'ensemble de la boutique</p>
        </div>
        <Link to="/gestion-mojo-privee/produits/nouveau" className="btn btn-primary btn-sm">
          <i className="fas fa-plus" aria-hidden="true" /> Nouveau produit
        </Link>
      </header>

      {/* Chiffres clés — pas de graphique là où un nombre suffit. */}
      <div className="stat-row">
        <Stat label="Ventes du mois" value={formatPrice(stats.month.revenue)}
          sub={`${stats.month.orders} commande${stats.month.orders > 1 ? 's' : ''}`} icon="fas fa-sack-dollar" />
        <Stat label="Aujourd'hui" value={formatPrice(stats.today.revenue)}
          sub={`${stats.today.orders} commande${stats.today.orders > 1 ? 's' : ''}`} icon="fas fa-calendar-day" />
        <Stat label="Encaissé au total" value={formatPrice(stats.totals.revenue)}
          sub={`${formatPrice(stats.totals.pipeline)} en cours`} icon="fas fa-chart-line" />
        <Stat label="Clientes" value={stats.counts.customers}
          sub={`${stats.counts.products} produits en ligne`} icon="fas fa-users" />
      </div>

      {/* Alertes actionnables, en haut : ce sont elles qui déclenchent le travail. */}
      {(stats.byStatus.en_attente > 0 || stats.lowStock.length > 0 || stats.counts.pending_reviews > 0) && (
        <div className="alert-row">
          {stats.byStatus.en_attente > 0 && (
            <Link to="/gestion-mojo-privee/commandes?statut=en_attente" className="alert-card">
              <i className="fas fa-bell" aria-hidden="true" />
              <div>
                <strong>{stats.byStatus.en_attente} commande{stats.byStatus.en_attente > 1 ? 's' : ''} à traiter</strong>
                <span>À confirmer auprès des clientes</span>
              </div>
            </Link>
          )}
          {stats.lowStock.length > 0 && (
            <Link to="/gestion-mojo-privee/produits?statut=stock-bas" className="alert-card warn">
              <i className="fas fa-triangle-exclamation" aria-hidden="true" />
              <div>
                <strong>{stats.lowStock.length} déclinaison{stats.lowStock.length > 1 ? 's' : ''} en stock faible</strong>
                <span>{stats.lowStock.slice(0, 2).map((s) => `${s.name}${s.size ? ` ${s.size}` : ''}`).join(', ')}…</span>
              </div>
            </Link>
          )}
          {stats.counts.pending_reviews > 0 && (
            <Link to="/gestion-mojo-privee/avis" className="alert-card">
              <i className="fas fa-star" aria-hidden="true" />
              <div>
                <strong>{stats.counts.pending_reviews} avis en attente</strong>
                <span>À publier ou à refuser</span>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="chart-grid">
        <div className="panel"><RevenueChart data={stats.daily} /></div>
        <div className="panel"><TopProductsChart data={stats.topProducts} /></div>
      </div>

      <div className="chart-grid">
        <section className="panel">
          <h2>Commandes par statut</h2>
          <div className="status-grid">
            {STATUS_ORDER.map(([id, label, cls]) => (
              <Link key={id} to={`/gestion-mojo-privee/commandes?statut=${id}`} className="status-tile">
                <span className={`status-pill ${cls}`}>{label}</span>
                <strong>{stats.byStatus[id] || 0}</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Stock à surveiller</h2>
          {stats.lowStock.length === 0 ? (
            <p className="chart-empty">Tous les stocks sont confortables.</p>
          ) : (
            <table className="admin-table compact">
              <thead><tr><th>Produit</th><th>Déclinaison</th><th>Stock</th></tr></thead>
              <tbody>
                {stats.lowStock.slice(0, 8).map((s) => (
                  <tr key={s.variant_id}>
                    <td><Link to={`/gestion-mojo-privee/produits/${s.id}`}>{s.name}</Link></td>
                    <td>{[s.size, s.color].filter(Boolean).join(' · ') || 'Unique'}</td>
                    <td><span className={`status-pill ${s.stock === 0 ? 'bad' : 'wait'}`}>{s.stock}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon }) {
  return (
    <div className="stat-tile">
      <i className={icon} aria-hidden="true" />
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      <span className="stat-sub">{sub}</span>
    </div>
  );
}
