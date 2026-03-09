import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Dashboard states
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Vêtements', price: '', price_display: '', image: '', description: ''
  });
  const [editPrices, setEditPrices] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) loadAdminData();
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadAdminData();
    });
  }, []);

  const loadAdminData = async () => {
    const { data: prodData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (prodData) setProducts(prodData);
    
    const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (salesData) setSales(salesData);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (isSignUp) {
      const { error: signUpErr } = await supabase.auth.signUp({ email, password });
      error = signUpErr;
      if (!error) alert("Inscription réussie ! Veuillez vérifier votre boîte mail si la confirmation est requise par Supabase, ou connectez-vous directement.");
    } else {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      error = signInErr;
    }
    
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.price_display) {
      newProduct.price_display = `${newProduct.price} FCFA`;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(newProduct)
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur inconnue');
      }
      
      alert("Produit ajouté avec succès !");
      setNewProduct({ name: '', category: 'Vêtements', price: '', price_display: '', image: '', description: '' });
      loadAdminData();
    } catch (error) {
       alert("Erreur lors de l'ajout: " + error.message);
    }
  };

  const updatePrice = async (id) => {
    const newPrice = editPrices[id];
    if (!newPrice) return;
    const priceDisplay = `${newPrice} FCFA`;
    
    try {
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ price: newPrice, price_display: priceDisplay })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur inconnue');
      }
      
      alert("Prix mis à jour !");
      loadAdminData();
    } catch (error) {
      alert("Erreur de mise à jour: " + error.message);
    }
  };

  if (loading) return <main style={{ padding: '60px', textAlign: 'center' }}>Chargement...</main>;

  if (!session) {
    return (
      <main style={{ padding: '40px 16px', maxWidth: '400px', margin: '0 auto', minHeight: '60vh' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '8px' }}>Espace Administrateur</h2>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          {isSignUp ? "Créez votre compte administrateur" : "Connectez-vous à votre compte"}
        </p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <input 
            type="email" 
            placeholder="Email (ex: admin@mojomolado.com)" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          />
          <input 
            type="password" 
            placeholder="Mot de passe" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
          />
          <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
            {isSignUp ? "S'inscrire" : "Se connecter"}
          </button>

          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}
          >
            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: '40px 16px', maxWidth: '1000px', margin: '0 auto', minHeight: '60vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2>Tableau de Bord Admin</h2>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          Déconnexion
        </button>
      </div>

      <section style={{ marginBottom: '60px', background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h3>Ajouter un nouveau produit</h3>
        <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '20px' }}>
          <input type="text" placeholder="Nom du produit" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required style={{ padding: '10px' }}/>
          <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} style={{ padding: '10px' }}>
            <option value="Vêtements">Vêtements</option>
            <option value="Sacs">Sacs</option>
            <option value="Parfums">Parfums</option>
          </select>
          <input type="number" placeholder="Prix (FCFA)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})} required style={{ padding: '10px' }}/>
          <input type="text" placeholder="URL de l'image (ex: /robes/robe.jpg)" value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})} required style={{ padding: '10px' }}/>
          <textarea placeholder="Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} style={{ gridColumn: '1 / -1', padding: '10px', minHeight: '80px' }} />
          <button type="submit" style={{ gridColumn: '1 / -1', padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            Enregistrer le produit
          </button>
        </form>
      </section>

      <section style={{ background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h3>Gérer les produits existants</h3>
        <div style={{ marginTop: '20px', display: 'grid', gap: '16px' }}>
          {products.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ flex: 1 }}>
                <strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)' }}>({p.category})</span>
                <div style={{ fontSize: '14px' }}>Prix actuel : {p.price_display || `${p.price} FCFA`}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input 
                  type="number" 
                  placeholder="Nouveau prix"
                  value={editPrices[p.id] || ''}
                  onChange={e => setEditPrices({...editPrices, [p.id]: e.target.value})}
                  style={{ padding: '6px', width: '120px' }}
                />
                <button onClick={() => updatePrice(p.id)} style={{ background: 'var(--text-main)', color: 'var(--surface-color)', padding: '6px 12px', border: 'none', borderRadius: '4px' }}>
                  Modifier
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section style={{ marginTop: '60px', background: 'var(--surface-color)', padding: '24px', borderRadius: '16px', boxShadow: 'var(--shadow-sm)' }}>
        <h3>Historique des Ventes</h3>
        {sales.length === 0 ? <p>Aucune vente enregistrée pour le moment.</p> : (
          <table style={{ width: '100%', textAlign: 'left', marginTop: '20px' }}>
             <thead>
               <tr>
                 <th>Date</th>
                 <th>Total</th>
                 <th>Détails</th>
               </tr>
             </thead>
             <tbody>
               {sales.map(s => (
                 <tr key={s.id}>
                   <td>{s.date}</td>
                   <td>{s.total} FCFA</td>
                   <td>{s.items?.length || 0} articles</td>
                 </tr>
               ))}
             </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
