import React from 'react';
import { useCart } from '../contexts/CartContext';

function Wishlist() {
  const { wishlist, toggleWishlist, isWishlistOpen, setIsWishlistOpen, addToCart, setIsCartOpen } = useCart();
  
  if (!isWishlistOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsWishlistOpen(false)}>
      <div className="modal-content">
        <button className="close-modal" onClick={() => setIsWishlistOpen(false)}>&times;</button>
        <h2>Vos Favoris</h2>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {wishlist.map(item => (
            <div key={item.id} className="wishlist-item" style={{ gap: '16px' }}>
              <img src={item.image.startsWith('http') ? item.image : (item.image.startsWith('/') ? item.image : `/${item.image}`)} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', marginBottom: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-color)' }}>{item.price_display || `${item.price} FCFA`}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { addToCart(item); setIsWishlistOpen(false); setIsCartOpen(true); }} style={{ background: 'var(--text-color)', color: 'var(--bg-color)', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  <i className="fas fa-shopping-cart"></i>
                </button>
                <button onClick={() => toggleWishlist(item)} style={{ background: 'transparent', color: '#ff4444', border: '1px solid #ff4444', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
          {wishlist.length === 0 && <p>Aucun favori.</p>}
        </div>
      </div>
    </div>
  );
}

export default Wishlist;
