import React, { useState } from 'react';
import { formatPrice } from '../../lib/format';

/**
 * Meilleures ventes — barres horizontales, série unique.
 * Barres ≤ 24px, extrémité arrondie 4px côté donnée, carrée à la ligne de base.
 */
export default function TopProductsChart({ data = [] }) {
  const [showTable, setShowTable] = useState(false);
  const [hover, setHover] = useState(null);

  if (!data.length) return <p className="chart-empty">Aucune vente enregistrée pour l'instant.</p>;

  const max = Math.max(...data.map((d) => d.units));

  return (
    <div className="chart">
      <div className="chart-head">
        <div>
          <h3>Meilleures ventes</h3>
          <p className="chart-sub">En nombre d'articles vendus</p>
        </div>
        <button type="button" className="chart-toggle" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </div>

      {showTable ? (
        <div className="chart-table-wrap">
          <table className="chart-table">
            <caption className="sr-only">Meilleures ventes par nombre d'articles</caption>
            <thead><tr><th scope="col">Produit</th><th scope="col">Articles</th><th scope="col">Chiffre d'affaires</th></tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.product_id || d.name}>
                  <td>{d.name}</td><td>{d.units}</td><td>{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="bar-list">
          {data.map((d) => (
            <li key={d.product_id || d.name}
              onMouseEnter={() => setHover(d.product_id || d.name)}
              onMouseLeave={() => setHover(null)}>
              <span className="bar-name" title={d.name}>{d.name}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${Math.max(4, (d.units / max) * 100)}%` }} />
              </span>
              <span className="bar-value">
                {hover === (d.product_id || d.name) ? formatPrice(d.revenue) : `${d.units} vendu${d.units > 1 ? 's' : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
