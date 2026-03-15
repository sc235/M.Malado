import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Admin() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Dashboard states
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '', category: 'Vêtements', price: '', price_display: '', description: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
    if (salesData) {
      setSales(salesData);
      
      // Process data for chart: group by date and sum totals
      const groupedData = salesData.reduce((acc, sale) => {
        const date = sale.date || new Date(sale.created_at).toLocaleDateString('fr-FR');
        if (!acc[date]) acc[date] = 0;
        acc[date] += sale.total;
        return acc;
      }, {});
      
      const formattedChartData = Object.keys(groupedData)
        .map(date => ({ date, total: groupedData[date] }))
        .slice(0, 7) // Last 7 days with sales
        .reverse(); // Chronological order
        
      setChartData(formattedChartData);
    }
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
    
    if (!imageFile) {
      alert("Veuillez sélectionner une image pour le produit.");
      return;
    }

    try {
      setUploadingImage(true);
      
      // 1. Upload image to Supabase Storage
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${newProduct.category.toLowerCase()}/${fileName}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('product-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        throw new Error(`Erreur d'upload d'image: ${uploadError.message}`);
      }
      
      // 2. Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      // 3. Save product in database via Node backend
      const productToSave = {
        ...newProduct,
        image: publicUrl
      };

      const response = await fetch('https://mojomalado-api.onrender.com/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(productToSave)
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur inconnue');
      }
      
      alert("Produit ajouté avec succès !");
      setNewProduct({ name: '', category: 'Vêtements', price: '', price_display: '', description: '' });
      setImageFile(null);
      
      // Reset the file input visually
      const fileInput = document.getElementById('image-upload');
      if (fileInput) fileInput.value = '';
      
      loadAdminData();
    } catch (error) {
       alert("Erreur lors de l'ajout: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const updatePrice = async (id) => {
    const newPrice = editPrices[id];
    if (!newPrice) return;
    const priceDisplay = `${newPrice} FCFA`;
    
    try {
      const response = await fetch(`https://mojomalado-api.onrender.com/api/products/${id}`, {
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
    <main style={{ padding: '60px 20px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '2.2rem', margin: 0 }}>Tableau de Bord Admin</h2>
        <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', padding: '10px 20px', border: 'none', borderRadius: 'var(--radius-full)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
          <i className="fas fa-sign-out-alt"></i> Déconnexion
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '40px' }}>
        {/* Colonne de Gauche : Ajouter / Ventes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          <section style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)' }}><i className="fas fa-plus-circle"></i> Ajouter un produit</h3>
            
            <form onSubmit={handleAddProduct} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Nom du produit</label>
                <input type="text" placeholder="Ex: Robe Wax Élégante" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}/>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Catégorie</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}>
                    <option value="Vêtements">Vêtements</option>
                    <option value="Sacs">Sacs</option>
                    <option value="Parfums">Parfums</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Prix (FCFA)</label>
                  <input type="number" placeholder="Ex: 15000" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: parseInt(e.target.value)})} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}/>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Image du produit</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input 
                    id="image-upload"
                    type="file" 
                    accept="image/*"
                    onChange={e => setImageFile(e.target.files[0])} 
                    required 
                    style={{ flex: 1, color: 'var(--text-main)' }}
                  />
                  {imageFile && <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}><i className="fas fa-check-circle"></i> Sélectionnée</span>}
                </div>
                <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>L'image sera automatiquement téléchargée vers Supabase.</small>
              </div>

              <button type="submit" disabled={uploadingImage} style={{ marginTop: '10px', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.05rem', cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(217,119,6,0.2)' }}>
                {uploadingImage ? <><i className="fas fa-spinner fa-spin"></i> Téléchargement en cours...</> : <><i className="fas fa-save"></i> Enregistrer le produit</>}
              </button>
            </form>
          </section>

          <section style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--secondary)' }}><i className="fas fa-chart-line"></i> Dernières Ventes</h3>
            
            {/* GRAPHIQUE DES VENTES */}
            {chartData.length > 0 && (
              <div style={{ width: '100%', height: '250px', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `${val/1000}k`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      formatter={(value) => [`${value.toLocaleString()} FCFA`, 'Ventes']}
                      contentStyle={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: 'var(--shadow-lg)' }}
                    />
                    <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {sales.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-color)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                <i className="fas fa-shopping-bag" style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.5 }}></i>
                <p>Aucune vente enregistrée pour le moment.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Date</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Total</th>
                      <th style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>Articles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 5).map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 8px' }}>{s.date || new Date(s.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 8px', fontWeight: 'bold', color: 'var(--primary)' }}>{s.total.toLocaleString()} FCFA</td>
                        <td style={{ padding: '12px 8px' }}>
                          <span style={{ background: 'var(--bg-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {s.items?.length || 0} art.
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Colonne de Droite : Gestion des catalogues */}
        <section style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}><i className="fas fa-boxes"></i> Gérer le catalogue ({products.length})</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto', maxHeight: '800px', paddingRight: '10px' }}>
            {products.map(p => {
              let imagePath = p.image;
              if (!imagePath.startsWith('http')) {
                imagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
              }
              
              return (
                <div key={p.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform='translateX(4px)'} onMouseLeave={e => e.currentTarget.style.transform='translateX(0)'}>
                  
                  <img src={imagePath} alt={p.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', background: 'var(--border-color)' }} loading="lazy" />
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '4px' }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', background: 'var(--surface-color)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>{p.category}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>{p.price_display || `${p.price} FCFA`}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                      <input 
                        type="number" 
                        placeholder="Nvx Prix"
                        value={editPrices[p.id] || ''}
                        onChange={e => setEditPrices({...editPrices, [p.id]: e.target.value})}
                        style={{ padding: '8px 10px', width: '90px', border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
                      />
                      <button onClick={() => updatePrice(p.id)} style={{ background: 'var(--secondary)', color: 'white', padding: '0 12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='var(--text-main)'} onMouseLeave={e => e.currentTarget.style.background='var(--secondary)'} title="Valider le nouveau prix">
                        <i className="fas fa-check"></i>
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
