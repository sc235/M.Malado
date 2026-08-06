import React, { useMemo, useState, useId } from 'react';
import { formatPrice } from '../../lib/format';

/**
 * Chiffre d'affaires sur 30 jours — série unique.
 * Une seule série : pas de légende, le titre porte l'information.
 * Couleur validée sur les deux surfaces (clair #B85C38 / sombre #D2764E).
 */
export default function RevenueChart({ data = [], height = 220 }) {
  const uid = useId().replace(/:/g, '');
  const [hover, setHover] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const W = 720;
  const H = height;
  const PAD = { top: 18, right: 18, bottom: 26, left: 54 };

  const { points, max, ticks } = useMemo(() => {
    const values = data.map((d) => Number(d.revenue) || 0);
    const rawMax = Math.max(1, ...values);
    /* Arrondi de l'axe à un palier lisible : 0 / 25 000 / 50 000… */
    const step = Math.pow(10, Math.floor(Math.log10(rawMax))) / 2 || 1;
    const niceMax = Math.ceil(rawMax / step) * step;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const pts = data.map((d, i) => ({
      ...d,
      value: Number(d.revenue) || 0,
      x: PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: PAD.top + innerH - ((Number(d.revenue) || 0) / niceMax) * innerH,
    }));

    return {
      points: pts,
      max: niceMax,
      ticks: [0, niceMax / 2, niceMax],
    };
  }, [data, H]);

  if (!data.length) {
    return <p className="chart-empty">Pas encore de données à afficher.</p>;
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${points.at(-1).x.toFixed(1)},${H - PAD.bottom} L${points[0].x.toFixed(1)},${H - PAD.bottom} Z`;

  const last = points.at(-1);
  const peak = points.reduce((a, b) => (b.value > a.value ? b : a), points[0]);
  const total = points.reduce((s, p) => s + p.value, 0);

  const onMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const nearest = points.reduce((a, b) => (Math.abs(b.x - x) < Math.abs(a.x - x) ? b : a), points[0]);
    setHover(nearest);
  };

  const label = (d) =>
    new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return (
    <div className="chart">
      <div className="chart-head">
        <div>
          <h3>Chiffre d'affaires — 30 derniers jours</h3>
          <p className="chart-sub">{formatPrice(total)} au total</p>
        </div>
        <button type="button" className="chart-toggle" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Voir le graphique' : 'Voir le tableau'}
        </button>
      </div>

      {showTable ? (
        <div className="chart-table-wrap">
          <table className="chart-table">
            <caption className="sr-only">Chiffre d'affaires quotidien sur 30 jours</caption>
            <thead><tr><th scope="col">Jour</th><th scope="col">Commandes</th><th scope="col">Chiffre d'affaires</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.day}>
                  <td>{label(p)}</td>
                  <td>{p.orders}</td>
                  <td>{formatPrice(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chart-body">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" preserveAspectRatio="none"
            aria-label={`Chiffre d'affaires quotidien sur 30 jours, total ${formatPrice(total)}`}
            onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={`wash-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-series)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--chart-series)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grille : filet plein d'un pas au-dessus de la surface */}
            {ticks.map((t) => {
              const y = PAD.top + (H - PAD.top - PAD.bottom) * (1 - t / max);
              return (
                <g key={t}>
                  <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} className="chart-grid" />
                  <text x={PAD.left - 10} y={y + 4} className="chart-axis" textAnchor="end">
                    {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
                  </text>
                </g>
              );
            })}

            <path d={areaPath} fill={`url(#wash-${uid})`} />
            <path d={linePath} className="chart-line" />

            {/* Repère de survol */}
            {hover && (
              <g>
                <line x1={hover.x} x2={hover.x} y1={PAD.top} y2={H - PAD.bottom} className="chart-crosshair" />
                <circle cx={hover.x} cy={hover.y} r="5" className="chart-dot" />
              </g>
            )}

            {/* Point final, toujours visible */}
            <circle cx={last.x} cy={last.y} r="4.5" className="chart-dot" />

            {/* Étiquettes directes : seulement le pic et la fin */}
            {peak.value > 0 && peak !== last && (
              <text x={peak.x} y={peak.y - 12} className="chart-label" textAnchor="middle">
                {Math.round(peak.value / 1000)}k
              </text>
            )}

            <text x={PAD.left} y={H - 8} className="chart-axis" textAnchor="start">{label(points[0])}</text>
            <text x={W - PAD.right} y={H - 8} className="chart-axis" textAnchor="end">{label(last)}</text>
          </svg>

          {hover && (
            <div className="chart-tip" style={{ left: `${(hover.x / W) * 100}%` }}>
              <strong>{label(hover)}</strong>
              <span>{formatPrice(hover.value)}</span>
              <span>{hover.orders} commande{hover.orders > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
