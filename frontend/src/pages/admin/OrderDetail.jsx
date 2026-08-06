import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, waLink } from '../../lib/api';
import { formatPrice, imageUrl } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

const FLOW = [
  ['confirmee', 'Confirmer', 'fas fa-circle-check'],
  ['preparation', 'Mettre en préparation', 'fas fa-box-open'],
  ['expediee', 'Marquer comme expédiée', 'fas fa-truck-fast'],
  ['livree', 'Marquer comme livrée', 'fas fa-house-circle-check'],
];

const CLASS = {
  en_attente: 'wait', confirmee: 'ok', preparation: 'ok',
  expediee: 'ok', livree: 'done', annulee: 'bad',
};

export default function OrderDetail() {
  const { id } = useParams();
  const { notify } = useCart();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => adminApi.order(id).then(setOrder).catch((err) => notify(err.message, 'error'));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!order) return <div className="loader"><div className="loader-spinner" /></div>;

  const changeStatus = async (status, message) => {
    setBusy(true);
    try {
      await adminApi.setStatus(order.id, status, message);
      notify('Statut mis à jour. La cliente le voit sur sa page de suivi.');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setBusy(true);
    try {
      await adminApi.setPayment(order.id, 'paye');
      notify('Paiement enregistré.');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const currentIndex = FLOW.findIndex(([s]) => s === order.status);
  const next = order.status === 'en_attente' ? FLOW[0] : FLOW[currentIndex + 1];

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <Link to="/gestion-mojo-privee/commandes" className="back-link">
            <i className="fas fa-arrow-left" aria-hidden="true" /> Commandes
          </Link>
          <h1>{order.reference}</h1>
          <p>
            {new Date(order.created_at).toLocaleString('fr-FR', {
              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`status-pill large ${CLASS[order.status]}`}>{order.statusLabel}</span>
      </header>

      <div className="admin-cols">
        <div>
          <section className="panel">
            <h2>Articles</h2>
            {order.items.map((item) => (
              <div className="line-item" key={item.id}>
                <div className="line-thumb"><img src={imageUrl(item.image)} alt="" loading="lazy" /></div>
                <div>
                  <div className="line-name">{item.name}</div>
                  <div className="line-meta">
                    {[item.size, item.color].filter(Boolean).join(' · ') || 'Taille unique'} · ×{item.quantity}
                  </div>
                </div>
                <div className="line-right">
                  <span className="line-price">{formatPrice(item.unit_price * item.quantity)}</span>
                  <span className="cell-sub">{formatPrice(item.unit_price)} l'unité</span>
                </div>
              </div>
            ))}

            <div className="summary-row" style={{ marginTop: 18 }}>
              <span>Sous-total</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Livraison</span><span>{order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)}</span>
            </div>
            <div className="summary-total"><span>Total</span><strong>{formatPrice(order.total)}</strong></div>
          </section>

          <section className="panel">
            <h2>Historique</h2>
            <ol className="timeline">
              {order.timeline.map((e, i) => (
                <li key={i}>
                  <strong>{e.label}</strong>
                  {e.message && <p>{e.message}</p>}
                  <span>{new Date(e.created_at).toLocaleString('fr-FR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside>
          <section className="panel">
            <h2>Actions</h2>

            {next && order.status !== 'annulee' && (
              <button type="button" className="btn btn-primary btn-block" disabled={busy}
                onClick={() => changeStatus(next[0])}>
                <i className={next[2]} aria-hidden="true" /> {next[1]}
              </button>
            )}

            {order.payment_status !== 'paye' && (
              <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 10 }}
                disabled={busy} onClick={markPaid}>
                <i className="fas fa-money-bill-wave" aria-hidden="true" /> Marquer comme payée
              </button>
            )}

            <a className="btn btn-wa btn-block" style={{ marginTop: 10 }}
              href={waLink(`Bonjour ${order.customer_name.split(' ')[0]} ! Concernant votre commande ${order.reference} chez Mojo Malado…`)}
              target="_blank" rel="noopener noreferrer">
              <i className="fab fa-whatsapp" aria-hidden="true" /> Écrire à la cliente
            </a>

            {order.status !== 'annulee' && order.status !== 'livree' && (
              <button type="button" className="btn btn-ghost btn-block btn-sm danger" style={{ marginTop: 10 }}
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt('Motif de l\'annulation (visible par la cliente) :', 'Article indisponible');
                  if (reason !== null) changeStatus('annulee', reason);
                }}>
                <i className="fas fa-ban" aria-hidden="true" /> Annuler la commande
              </button>
            )}

            {order.status !== 'annulee' && order.status !== 'livree' && (
              <p className="field-hint" style={{ marginTop: 10 }}>
                L'annulation remet automatiquement les articles en stock.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Cliente</h2>
            <p className="detail-line"><strong>{order.customer_name}</strong></p>
            <p className="detail-line">
              <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
            </p>
            {order.customer_email && (
              <p className="detail-line"><a href={`mailto:${order.customer_email}`}>{order.customer_email}</a></p>
            )}
            <p className="detail-line" style={{ marginTop: 12 }}>
              {order.address_line}<br />{order.city}
            </p>
            {order.note && (
              <div className="inline-note" style={{ marginTop: 12 }}>
                <i className="fas fa-comment" aria-hidden="true" />
                <span>{order.note}</span>
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Paiement</h2>
            <p className="detail-line">
              Moyen : <strong>{order.payment_method}</strong>
            </p>
            <p className="detail-line">
              Statut :{' '}
              <span className={`status-pill ${order.payment_status === 'paye' ? 'done' : 'wait'}`}>
                {order.payment_status === 'paye' ? 'Payé' : 'En attente'}
              </span>
            </p>
            {order.transaction_id && (
              <p className="detail-line cell-sub">Transaction : {order.transaction_id}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
