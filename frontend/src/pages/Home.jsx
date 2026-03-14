import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';

function Home() {
  const [products, setProducts] = useState([]);
  const [displayedProducts, setDisplayedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOption, setSortOption] = useState('default');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedProduct, setSelectedProduct] = useState(null);

  const defaultReviews = [
    {
      id: 1,
      name: "Aminata Diallo",
      text: "J'ai commandé la robe Beige pour un mariage. La qualité du tissu est incroyable et la livraison a été très rapide via WhatsApp. Je recommande absolument Mojo Molado !",
      rating: 5,
      date: new Date().toLocaleDateString()
    },
    {
      id: 2,
      name: "Fatou Ndiaye",
      text: "Le grand sac YSL est magnifique et très spacieux. C'est exactement ce que je cherchais pour le travail. Le service client est au top !",
      rating: 4.5,
      date: new Date().toLocaleDateString()
    },
    {
      id: 3,
      name: "Mariama Sow",
      text: "Les brumes Victoria Secret sentent tellement bon ! J'ai pris la Purple et la Originale. Très contente de mes achats, je reviendrai.",
      rating: 5,
      date: new Date().toLocaleDateString()
    }
  ];

  const [reviews, setReviews] = useState(() => {
    const saved = localStorage.getItem('mojo_reviews');
    return saved ? JSON.parse(saved) : defaultReviews;
  });
  
  const [reviewForm, setReviewForm] = useState({ name: '', text: '', rating: 5 });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewForm.name.trim() || !reviewForm.text.trim()) return;
    const newRev = {
      ...reviewForm,
      id: Date.now(),
      date: new Date().toLocaleDateString()
    };
    const updated = [newRev, ...reviews];
    setReviews(updated);
    localStorage.setItem('mojo_reviews', JSON.stringify(updated));
    setReviewForm({ name: '', text: '', rating: 5 });
    alert('Merci pour votre avis ! Votre commentaire a été publié.');
  };

  const { addToCart, toggleWishlist, wishlist } = useCart();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('https://mojomalado-api.onrender.com/api/products');
      const data = await response.json();
      const shuffledData = shuffleArray([...data]);
      setProducts(shuffledData);
      setLoading(false);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = [...products];

    if (searchTerm) {
      result = result.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    if (sortOption === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sortOption === 'price-desc') result.sort((a, b) => b.price - a.price);

    setDisplayedProducts(result);
  }, [products, searchTerm, categoryFilter, sortOption]);

  const currentProducts = displayedProducts.slice(0, page * itemsPerPage);

  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    for(let i=0; i<fullStars; i++) stars.push(<i key={`full-${i}`} className="fas fa-star"></i>);
    if(hasHalf) stars.push(<i key="half" className="fas fa-star-half-alt"></i>);
    const empty = 5 - stars.length;
    for(let i=0; i<empty; i++) stars.push(<i key={`empty-${i}`} className="far fa-star"></i>);
    
    return stars;
  };

  if (loading) {
    return (
      <main>
        <div className="loader">
          <div className="loader-spinner"></div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <section id="shop">
        <h2 className="section-title">Notre Collection</h2>
        
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Rechercher un produit..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} aria-label="Trier par">
            <option value="default">Pertinence</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
          <div className="filters">
            <button className={categoryFilter === 'all' ? 'active' : ''} onClick={() => setCategoryFilter('all')}>Tout</button>
            <button className={categoryFilter === 'Vêtements' ? 'active' : ''} onClick={() => setCategoryFilter('Vêtements')}>Vêtements</button>
            <button className={categoryFilter === 'Sacs' ? 'active' : ''} onClick={() => setCategoryFilter('Sacs')}>Sacs</button>
            <button className={categoryFilter === 'Parfums' ? 'active' : ''} onClick={() => setCategoryFilter('Parfums')}>Parfums</button>
          </div>
        </div>

        <div className="product-grid">
          {currentProducts.map(product => {
            const isFav = wishlist.some(w => w.id === product.id);
            let imagePath = product.image;
            if (!imagePath.startsWith('http')) {
              imagePath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
            }
            
            return (
              <div key={product.id} className="product-card">
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                  <button 
                    onClick={() => toggleWishlist(product)}
                    style={{ background: 'var(--surface-color)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
                  >
                    <i className={isFav ? 'fas fa-heart' : 'far fa-heart'} style={{ color: isFav ? '#ff4444' : 'var(--text-color)', fontSize: '18px' }}></i>
                  </button>
                </div>
                <div className="image-container" onClick={() => setSelectedProduct(product)} style={{ cursor: 'pointer' }}>
                  <img src={imagePath} alt={product.name} loading="lazy" />
                  <div className="quick-view-overlay">
                    <span>Voir détails</span>
                  </div>
                </div>
                <div className="product-body">
                  <h3 onClick={() => setSelectedProduct(product)} style={{ cursor: 'pointer' }}>{product.name}</h3>
                  <div className="product-price">{product.price_display || `${product.price} FCFA`}</div>
                  <div className="rating">
                    {getRatingStars(product.rating || 4.5)} <span>{product.rating || 4.5}</span>
                  </div>
                  <div className="product-actions">
                    <button className="primary" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                      <i className="fas fa-cart-plus"></i> Ajouter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {currentProducts.length < displayedProducts.length && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button 
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '12px 24px', borderRadius: '25px', background: 'transparent', border: '2px solid var(--text-color)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Voir plus d'articles
            </button>
          </div>
        )}
        
        {displayedProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Aucun produit ne correspond à votre recherche.</p>
          </div>
        )}
      </section>

      {/* SECTION AVIS CLIENTS */}
      <section id="reviews" style={{ maxWidth: '1000px', margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <h2 className="section-title">Avis de nos clients</h2>
        
        {/* Affichage des avis */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginTop: '40px', marginBottom: '60px' }}>
          {reviews.map((rev) => (
            <div key={rev.id} style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', textAlign: 'left', position: 'relative' }}>
              <i className="fas fa-quote-left" style={{ position: 'absolute', top: '20px', right: '20px', fontSize: '2rem', color: 'var(--border-color)', opacity: '0.5' }}></i>
              <div style={{ display: 'flex', gap: '4px', color: 'var(--accent)', marginBottom: '15px' }}>
                {getRatingStars(rev.rating)}
              </div>
              <p style={{ fontStyle: 'italic', marginBottom: '20px', lineHeight: '1.6', color: 'var(--text-main)' }}>
                "{rev.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {rev.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong style={{ display: 'block' }}>{rev.name}</strong>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rev.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Formulaire pour laisser un avis */}
        <div style={{ background: 'var(--surface-color)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1.5rem', fontFamily: 'Playfair Display, serif' }}>Laissez votre avis</h3>
          <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Votre Nom</label>
              <input 
                type="text" 
                value={reviewForm.name} 
                onChange={e => setReviewForm({...reviewForm, name: e.target.value})} 
                placeholder="Ex: Awa Diop" 
                required 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Note (sur 5)</label>
              <select 
                value={reviewForm.rating} 
                onChange={e => setReviewForm({...reviewForm, rating: parseFloat(e.target.value)})}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
              >
                <option value="5">5 - Excellent</option>
                <option value="4.5">4.5 - Très bien</option>
                <option value="4">4 - Bien</option>
                <option value="3">3 - Moyen</option>
                <option value="2">2 - Passable</option>
                <option value="1">1 - Décevant</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Votre Message</label>
              <textarea 
                value={reviewForm.text} 
                onChange={e => setReviewForm({...reviewForm, text: e.target.value})} 
                placeholder="Racontez-nous votre expérience avec Mojo Molado..." 
                required 
                rows="4"
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical', background: 'var(--bg-color)', color: 'var(--text-main)', fontFamily: 'inherit' }}
              />
            </div>
            <button type="submit" style={{ padding: '14px', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', transition: 'background 0.2s', marginTop: '10px' }}>
              Publier mon avis
            </button>
          </form>
        </div>
      </section>

      {/* SECTION À PROPOS */}
      <section id="about" style={{ maxWidth: '900px', margin: '80px auto', padding: '40px 30px', textAlign: 'center', background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
        <h2 className="section-title">À propos de Mojo Molado</h2>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-main)', marginBottom: '20px', lineHeight: '1.8', fontWeight: '500' }}>
          Bienvenue chez <strong>Mojo Molado</strong>, votre destination mode incontournable au cœur de Dakar (Sandaga, Rue Thiong).
        </p>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.8' }}>
          Née de la passion pour le style africain contemporain et l'artisanat d'exception, notre boutique réunit des vêtements de créateur, des sacs élégants, des parfums envoûtants et bien d'autres articles tendance. Nous mettons un point d'honneur à promouvoir l'élégance africaine à travers des pièces uniques et accessibles à tous les passionnés de mode.
        </p>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
          Chaque produit est soigneusement sélectionné par nos experts pour sa qualité supérieure, ses finitions impeccables et son charme authentique. Chez Mojo Molado, nous croyons que la mode est bien plus que des vêtements : c'est notre manière de nous exprimer — avec confiance, fierté et identité. <br/><br/><em style={{ color: 'var(--primary)', fontWeight: 'bold' }}>"Own your roots, Wear your culture."</em>
        </p>
      </section>

      {/* SECTION CONTACT */}
      <section id="contact" style={{ maxWidth: '1000px', margin: '40px auto 60px', padding: '20px', textAlign: 'center' }}>
        <h2 className="section-title">Où nous trouver</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginTop: '40px' }}>
          <div style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', transition: 'transform var(--transition-spring)', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <i className="fas fa-map-marker-alt" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '20px', background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}></i>
            <h3 style={{ marginBottom: '10px', fontSize: '1.3rem' }}>Notre Boutique</h3>
            <p style={{ color: 'var(--text-muted)' }}>Dakar, Marché Sandaga<br/>Rue Thiong</p>
          </div>
          <div style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', transition: 'transform var(--transition-spring)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <a href="https://wa.me/221710433624" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <i className="fab fa-whatsapp" style={{ fontSize: '3rem', color: '#25D366', marginBottom: '20px', background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}></i>
              <h3 style={{ marginBottom: '10px', fontSize: '1.3rem' }}>WhatsApp</h3>
              <p style={{ color: 'var(--text-muted)' }}>+221 71 043 36 24<br/>(Cliquez pour discuter)</p>
            </a>
          </div>
          <div style={{ background: 'var(--surface-color)', padding: '30px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', transition: 'transform var(--transition-spring)' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <a href="https://www.tiktok.com/@mojomalado_?lang=fr" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <i className="fab fa-tiktok" style={{ fontSize: '3rem', color: 'var(--text-main)', marginBottom: '20px', background: 'var(--bg-color)', padding: '15px', borderRadius: '50%' }}></i>
              <h3 style={{ marginBottom: '10px', fontSize: '1.3rem' }}>TikTok</h3>
              <p style={{ color: 'var(--text-muted)' }}>@mojomolado<br/>(Découvrez nos vidéos)</p>
            </a>
          </div>
        </div>
      </section>

      {/* MODAL DE DÉTAILS DU PRODUIT */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setSelectedProduct(null)}>
          <div className="modal-content product-details-modal" style={{ maxWidth: '900px', display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', gap: '30px', padding: window.innerWidth < 768 ? '20px' : '40px' }}>
            <button className="close-modal" onClick={() => setSelectedProduct(null)}>&times;</button>
            
            <div style={{ flex: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--border-color)', minHeight: '300px' }}>
              <img 
                src={selectedProduct.image.startsWith('http') ? selectedProduct.image : (selectedProduct.image.startsWith('/') ? selectedProduct.image : `/${selectedProduct.image}`)} 
                alt={selectedProduct.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            </div>
            
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                {selectedProduct.category}
              </span>
              <h2 style={{ fontSize: window.innerWidth < 768 ? '2rem' : '2.5rem', marginBottom: '16px', lineHeight: '1.2' }}>{selectedProduct.name}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '24px' }}>
                <div className="rating" style={{ margin: 0 }}>
                  {getRatingStars(selectedProduct.rating || 4.5)}
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>(Avis clients)</span>
              </div>
              
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '24px' }}>
                {selectedProduct.price_display || `${selectedProduct.price} FCFA`}
              </div>
              
              <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '10px', color: 'var(--text-main)' }}>Description</h4>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                  {selectedProduct.description || "Aucune description détaillée n'est disponible pour ce produit pour le moment. Fabriqué avec soin et passion."}
                </p>
              </div>
              
              <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                <button 
                  className="btn-checkout" 
                  style={{ background: 'var(--primary)', margin: 0, boxShadow: 'var(--shadow-md)' }}
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null); // Ferme la modale après ajout
                  }}
                >
                  <i className="fas fa-cart-plus" style={{ marginRight: '8px' }}></i> Ajouter au panier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Home;
