import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';
import { imageUrl } from '../../lib/format';
import { useCart } from '../../contexts/CartContext';

const SIZE_PRESETS = {
  'Vêtements': ['S', 'M', 'L', 'XL'],
  'Sandales': ['37', '38', '39', '40', '41'],
  'Parfums': ['100 ml', '250 ml'],
  'Sacs': [],
};

const emptyProduct = {
  name: '', description: '', categoryId: '', basePrice: '', compareAt: '',
  isActive: true, isFeatured: false,
};

export default function ProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'nouveau';
  const navigate = useNavigate();
  const { notify } = useCart();

  const [product, setProduct] = useState(emptyProduct);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([{ size: '', color: '', stock: 0, price: '' }]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { adminApi.categories().then(setCategories).catch(() => {}); }, []);

  const addCategoryQuickly = async () => {
    const name = window.prompt("Nom de la nouvelle collection :");
    if (!name || !name.trim()) return;
    try {
      const newCat = await adminApi.createCategory({ name: name.trim() });
      notify(`Collection "${newCat.name}" créée !`);
      const list = await adminApi.categories();
      setCategories(list);
      setProduct(prev => ({ ...prev, categoryId: String(newCat.id) }));
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  useEffect(() => {
    if (isNew) return;
    adminApi.product(id)
      .then((p) => {
        setProduct({
          name: p.name, description: p.description || '',
          categoryId: p.category_id || '', basePrice: p.base_price,
          compareAt: p.compare_at || '', isActive: p.is_active, isFeatured: p.is_featured,
        });
        setImages(p.images.map((i) => ({ url: i.url, alt: i.alt })));
        setVariants(p.variants.length ? p.variants.map((v) => ({
          id: v.id, size: v.size || '', color: v.color || '', stock: v.stock, price: v.price || '',
        })) : [{ size: '', color: '', stock: 0, price: '' }]);
      })
      .catch((err) => notify(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isNew, notify]);

  /* Les photos sont converties en data URL : pas de service de stockage à
     configurer, l'image part directement en base avec le produit. */
  const addFiles = async (fileList) => {
    const files = [...fileList].slice(0, 8 - images.length);
    for (const file of files) {
      if (file.size > 1.5 * 1024 * 1024) {
        notify(`${file.name} dépasse 1,5 Mo — compressez-la avant l'envoi.`, 'error');
        continue;
      }
      const url = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      setImages((prev) => [...prev, { url, alt: product.name }]);
    }
  };

  const categoryName = categories.find((c) => c.id === Number(product.categoryId))?.name;

  const applyPreset = () => {
    const sizes = SIZE_PRESETS[categoryName] || [];
    if (!sizes.length) { notify('Aucune taille prédéfinie pour cette catégorie.', 'error'); return; }
    setVariants(sizes.map((size) => ({ size, color: variants[0]?.color || '', stock: 0, price: '' })));
  };

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    const cleaned = variants
      .map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        size: v.size?.trim() || null,
        color: v.color?.trim() || null,
        stock: Number(v.stock) || 0,
        price: v.price ? Number(v.price) : null,
      }));

    /* Deux déclinaisons identiques feraient échouer la contrainte d'unicité :
       autant le dire clairement ici. */
    const seen = new Set();
    for (const v of cleaned) {
      const key = `${v.size}|${v.color}`;
      if (seen.has(key)) {
        notify('Deux déclinaisons ont la même taille et la même couleur.', 'error');
        return;
      }
      seen.add(key);
    }

    setSaving(true);
    try {
      const payload = {
        ...product,
        basePrice: Number(product.basePrice),
        compareAt: product.compareAt ? Number(product.compareAt) : null,
        categoryId: product.categoryId ? Number(product.categoryId) : null,
        images,
        variants: cleaned,
      };

      if (isNew) {
        const created = await adminApi.createProduct(payload);
        notify('Produit créé.');
        navigate(`/gestion-mojo-privee/produits/${created.id}`, { replace: true });
      } else {
        await adminApi.updateProduct(id, payload);
        notify('Produit enregistré.');
      }
    } catch (err) {
      setErrors(err.details || {});
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loader"><div className="loader-spinner" /></div>;

  return (
    <div className="admin-page">
      <header className="admin-head">
        <div>
          <Link to="/gestion-mojo-privee/produits" className="back-link">
            <i className="fas fa-arrow-left" aria-hidden="true" /> Produits
          </Link>
          <h1>{isNew ? 'Nouveau produit' : product.name}</h1>
        </div>
        <button type="submit" form="product-form" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? <><i className="fas fa-spinner fa-spin" aria-hidden="true" /> Enregistrement…</> : 'Enregistrer'}
        </button>
      </header>

      <form id="product-form" onSubmit={submit} className="admin-form">
        <div className="admin-form-main">
          <section className="panel">
            <h2>Informations</h2>

            <div className={`field ${errors.name ? 'has-error' : ''}`}>
              <label htmlFor="pf-name">Nom du produit</label>
              <input id="pf-name" type="text" required value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })} />
              {errors.name && <p className="field-msg">{errors.name}</p>}
            </div>

            <div className="field">
              <label htmlFor="pf-desc">Description</label>
              <textarea id="pf-desc" rows="5" value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
                placeholder="Matière, coupe, conseils d'entretien…" />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="pf-cat" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Catégorie
                  <button type="button" className="btn-link" onClick={addCategoryQuickly} style={{ fontSize: '0.85em', textTransform: 'none', fontWeight: 'normal', padding: 0, background: 'none', border: 'none', color: 'var(--color-primary, #6366f1)', cursor: 'pointer', textDecoration: 'underline' }}>
                    + Nouvelle collection
                  </button>
                </label>
                <select id="pf-cat" value={product.categoryId}
                  onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}>
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className={`field ${errors.basePrice ? 'has-error' : ''}`}>
                <label htmlFor="pf-price">Prix (FCFA)</label>
                <input id="pf-price" type="number" min="0" step="500" required value={product.basePrice}
                  onChange={(e) => setProduct({ ...product, basePrice: e.target.value })} />
                {errors.basePrice && <p className="field-msg">{errors.basePrice}</p>}
              </div>
              <div className="field">
                <label htmlFor="pf-compare">Prix barré (facultatif)</label>
                <input id="pf-compare" type="number" min="0" step="500" value={product.compareAt}
                  onChange={(e) => setProduct({ ...product, compareAt: e.target.value })} />
                <p className="field-hint">Affiche une promotion.</p>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------- Photos */}
          <section className="panel">
            <h2>Photos <span className="panel-sub">{images.length}/8</span></h2>

            <div className="image-grid">
              {images.map((img, i) => (
                <div key={i} className="image-cell">
                  <img src={imageUrl(img.url)} alt="" />
                  {i === 0 && <span className="image-main">Principale</span>}
                  <div className="image-actions">
                    {i > 0 && (
                      <button type="button" title="Mettre en avant"
                        onClick={() => setImages((prev) => {
                          const next = [...prev];
                          [next[0], next[i]] = [next[i], next[0]];
                          return next;
                        })}>
                        <i className="fas fa-star" aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" title="Supprimer"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>
                      <i className="fas fa-trash" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}

              {images.length < 8 && (
                <label className="image-drop">
                  <input type="file" accept="image/*" multiple hidden
                    onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                  <i className="fas fa-camera" aria-hidden="true" />
                  <span>Ajouter des photos</span>
                  <small>1,5 Mo maximum par image</small>
                </label>
              )}
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label htmlFor="pf-url">…ou coller une adresse d'image</label>
              <div className="inline-add">
                <input id="pf-url" type="url" placeholder="/robes.images/robeRouge.jpg ou https://…" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => {
                  const input = document.getElementById('pf-url');
                  if (input.value.trim()) {
                    setImages((prev) => [...prev, { url: input.value.trim(), alt: product.name }]);
                    input.value = '';
                  }
                }}>Ajouter</button>
              </div>
            </div>
          </section>

          {/* -------------------------------------------------- Déclinaisons */}
          <section className="panel">
            <h2>
              Déclinaisons & stock
              <span className="panel-sub">
                Total : {variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)}
              </span>
            </h2>
            <p className="field-hint" style={{ marginBottom: 14 }}>
              Une ligne par taille et couleur vendues. Laissez les deux vides pour un article en taille unique.
            </p>

            {SIZE_PRESETS[categoryName]?.length > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}
                onClick={applyPreset}>
                <i className="fas fa-wand-magic-sparkles" aria-hidden="true" /> Générer les tailles {categoryName}
              </button>
            )}

            <div className="variant-table">
              <div className="variant-head">
                <span>Taille</span><span>Couleur</span><span>Stock</span><span>Prix spécifique</span><span />
              </div>
              {variants.map((v, i) => (
                <div className="variant-row" key={v.id || i}>
                  <input type="text" placeholder="M / 39 / 100 ml" value={v.size}
                    onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))} />
                  <input type="text" placeholder="Beige" value={v.color}
                    onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)))} />
                  <input type="number" min="0" value={v.stock}
                    onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, stock: e.target.value } : x)))} />
                  <input type="number" min="0" step="500" placeholder="= prix de base" value={v.price}
                    onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
                  <button type="button" className="icon-btn danger" disabled={variants.length === 1}
                    onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} aria-label="Supprimer la ligne">
                    <i className="fas fa-xmark" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
              onClick={() => setVariants((p) => [...p, { size: '', color: '', stock: 0, price: '' }])}>
              <i className="fas fa-plus" aria-hidden="true" /> Ajouter une déclinaison
            </button>
          </section>
        </div>

        {/* ---------------------------------------------------- Publication */}
        <aside className="admin-form-side">
          <section className="panel">
            <h2>Publication</h2>
            <label className="switch">
              <input type="checkbox" checked={product.isActive}
                onChange={(e) => setProduct({ ...product, isActive: e.target.checked })} />
              <span>Visible dans la boutique</span>
            </label>
            <label className="switch">
              <input type="checkbox" checked={product.isFeatured}
                onChange={(e) => setProduct({ ...product, isFeatured: e.target.checked })} />
              <span>Mettre en avant sur l'accueil</span>
            </label>

            <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 18 }} disabled={saving}>
              {saving ? 'Enregistrement…' : isNew ? 'Créer le produit' : 'Enregistrer les modifications'}
            </button>

            {!isNew && (
              <a className="btn btn-ghost btn-block btn-sm" style={{ marginTop: 10 }}
                href={`/produit/${id}`} target="_blank" rel="noopener noreferrer">
                <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /> Voir dans la boutique
              </a>
            )}
          </section>
        </aside>
      </form>
    </div>
  );
}
