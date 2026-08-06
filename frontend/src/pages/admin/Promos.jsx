import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

/* ============================================================================
   Gestion des codes promo.

   Trois natures de remise : un pourcentage, un montant fixe, ou la livraison
   offerte. Le montant réel n'est jamais calculé ici — le serveur le recalcule
   à chaque commande. Cet écran ne fait que définir les règles.
   ========================================================================== */

const KINDS = [
  { id: 'percent',  label: 'Pourcentage',        hint: 'Ex : 10 pour −10 % du panier', unit: '%' },
  { id: 'amount',   label: 'Montant fixe',       hint: 'Ex : 5000 pour −5 000 FCFA',   unit: 'FCFA' },
  { id: 'shipping', label: 'Livraison offerte',  hint: 'Annule les frais de port',     unit: null },
];

const EMPTY = { code: '', kind: 'percent', value: 10, minSubtotal: 0, maxUses: '', endsAt: '' };

export default function Promos() {
  const { notify } = useCart();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.promos()
      .then(setPromos)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(load, [load]);

  const kind = KINDS.find((k) => k.id === form.kind);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminApi.createPromo({
        code: form.code,
        kind: form.kind,
        value: form.kind === 'shipping' ? 0 : Number(form.value),
        minSubtotal: Number(form.minSubtotal) || 0,
        maxUses: form.maxUses === '' ? undefined : Number(form.maxUses),
        endsAt: form.endsAt || undefined,
      });
      notify(`Code ${form.code.toUpperCase()} créé.`);
      setForm(EMPTY);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (promo) => {
    try {
      await adminApi.togglePromo(promo.id, !promo.is_active);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const remove = async (promo) => {
    if (!window.confirm(`Supprimer le code ${promo.code} ?`)) return;
    try {
      const res = await adminApi.deletePromo(promo.id);
      notify(res.message);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const describe = (p) => {
    if (p.kind === 'shipping') return 'Livraison offerte';
    if (p.kind === 'percent') return `−${p.value} %`;
    return `−${formatPrice(p.value)}`;
  };

  const expired = (p) => p.ends_at && new Date(p.ends_at) < new Date();
  const exhausted = (p) => p.max_uses !== null && p.used_count >= p.max_uses;

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Codes promo</h1>
          <p>{promos.length} code{promos.length > 1 ? 's' : ''} enregistré{promos.length > 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="admin-cols">
        {/* ------------------------------------------------------- La liste */}
        <div>
          {loading ? (
            <div className="loader"><div className="loader-spinner" /></div>
          ) : promos.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-tag" aria-hidden="true" />
              <h3>Aucun code promo</h3>
              <p>Créez votre premier code avec le formulaire ci-contre.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Remise</th><th>Conditions</th>
                    <th>Utilisations</th><th>Offert</th><th>État</th><th />
                  </tr>
                </thead>
                <tbody>
                  {promos.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="cell-strong">{p.code}</span>
                        {p.ends_at && (
                          <span className="cell-sub">
                            Jusqu'au {new Date(p.ends_at).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </td>
                      <td className="cell-strong">{describe(p)}</td>
                      <td className="cell-sub">
                        {p.min_subtotal > 0 ? `Dès ${formatPrice(p.min_subtotal)}` : 'Sans minimum'}
                        {p.max_uses !== null && <><br />Limité à {p.max_uses} usage{p.max_uses > 1 ? 's' : ''}</>}
                      </td>
                      <td>
                        {p.used_count}
                        {p.max_uses !== null && <span className="cell-sub">sur {p.max_uses}</span>}
                      </td>
                      <td className="cell-sub">{p.given > 0 ? formatPrice(p.given) : '—'}</td>
                      <td>
                        {!p.is_active ? (
                          <span className="status-pill bad">Désactivé</span>
                        ) : expired(p) ? (
                          <span className="status-pill wait">Expiré</span>
                        ) : exhausted(p) ? (
                          <span className="status-pill wait">Épuisé</span>
                        ) : (
                          <span className="status-pill done">Actif</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggle(p)}>
                            {p.is_active ? 'Désactiver' : 'Réactiver'}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm danger"
                            onClick={() => remove(p)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------------------------------------------------- Le formulaire */}
        <aside>
          <form className="panel" onSubmit={create}>
            <h2>Nouveau code</h2>

            <div className="field">
              <label htmlFor="pc-code">Code</label>
              <input id="pc-code" type="text" required maxLength={40}
                placeholder="BIENVENUE10"
                style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <p className="field-hint">La casse et les espaces sont ignorés à la saisie.</p>
            </div>

            <div className="field">
              <label htmlFor="pc-kind">Type de remise</label>
              <select id="pc-kind" value={form.kind}
                onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
              <p className="field-hint">{kind.hint}</p>
            </div>

            {form.kind !== 'shipping' && (
              <div className="field">
                <label htmlFor="pc-value">Valeur ({kind.unit})</label>
                <input id="pc-value" type="number" min={1}
                  max={form.kind === 'percent' ? 90 : undefined}
                  required value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </div>
            )}

            <div className="field">
              <label htmlFor="pc-min">Achat minimum (FCFA)</label>
              <input id="pc-min" type="number" min={0} value={form.minSubtotal}
                onChange={(e) => setForm({ ...form, minSubtotal: e.target.value })} />
              <p className="field-hint">0 = applicable dès le premier article.</p>
            </div>

            <div className="field">
              <label htmlFor="pc-max">Nombre d'utilisations</label>
              <input id="pc-max" type="number" min={1} placeholder="Illimité"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
              <p className="field-hint">Laissez vide pour ne pas limiter.</p>
            </div>

            <div className="field">
              <label htmlFor="pc-end">Date de fin</label>
              <input id="pc-end" type="date" value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              <p className="field-hint">Laissez vide pour un code sans expiration.</p>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !form.code.trim()}>
              {busy
                ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Création…</>
                : <><i className="fas fa-plus" aria-hidden="true" /> Créer le code</>}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
