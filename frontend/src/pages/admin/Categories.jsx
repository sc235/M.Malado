import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../lib/api';
import { useCart } from '../../contexts/CartContext';

const EMPTY = { name: '', description: '', image: '', position: 0 };

export default function Categories() {
  const { notify } = useCart();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.categories()
      .then(setCategories)
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(load, [load]);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      await adminApi.createCategory({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || undefined,
        position: Number(form.position) || 0,
      });
      notify(`Collection "${form.name}" créée avec succès.`);
      setForm(EMPTY);
      load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cat) => {
    const hasProducts = cat.product_count > 0;
    const confirmMessage = hasProducts 
      ? `Attention : La collection "${cat.name}" contient ${cat.product_count} produit(s). Si vous la supprimez, ces produits n'auront plus de collection associée. Continuer ?`
      : `Supprimer la collection "${cat.name}" ?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await adminApi.deleteCategory(cat.id);
      notify(res.message || 'Collection supprimée.');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <h1>Collections / Catégories</h1>
          <p>{categories.length} collection{categories.length > 1 ? 's' : ''} enregistrée{categories.length > 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="admin-cols">
        {/* ------------------------------------------------------- La liste */}
        <div>
          {loading ? (
            <div className="loader"><div className="loader-spinner" /></div>
          ) : categories.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-tags" aria-hidden="true" />
              <h3>Aucune collection</h3>
              <p>Créez votre première collection avec le formulaire ci-contre.</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Produits</th>
                    <th>Ordre</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span className="cell-strong">{c.name}</span>
                      </td>
                      <td>
                        <code className="cell-sub">{c.slug}</code>
                      </td>
                      <td className="cell-sub" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.description || <span style={{ color: '#ccc' }}>—</span>}
                      </td>
                      <td>
                        <span className={`status-pill ${c.product_count > 0 ? 'done' : 'wait'}`}>
                          {c.product_count} produit{c.product_count > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>{c.position}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="btn btn-ghost btn-sm danger"
                            onClick={() => remove(c)}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* -------------------------------------------------- Le formulaire */}
        <div>
          <form className="panel" onSubmit={create}>
            <h3>Nouvelle collection</h3>

            <div className="field">
              <label htmlFor="cat-name">Nom de la collection</label>
              <input id="cat-name" type="text" required placeholder="Ex : Sandales, Bijoux..."
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="cat-desc">Description</label>
              <textarea id="cat-desc" rows="3" placeholder="Description courte..."
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="cat-img">URL de l'image (facultatif)</label>
              <input id="cat-img" type="text" placeholder="/images/categories/sandales.jpg"
                value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
            </div>

            <div className="field">
              <label htmlFor="cat-pos">Ordre d'affichage (position)</label>
              <input id="cat-pos" type="number" min="0"
                value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              <p className="field-hint">Le plus petit nombre apparaît en premier.</p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
              {busy ? 'Création...' : 'Créer la collection'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
