import React from 'react';
import { useCart } from '../contexts/CartContext';

function Cart() {
  const { cart, removeFromCart, updateQuantity, isCartOpen, setIsCartOpen, clearCart } = useCart();
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (!cart.length) {
      alert('Votre panier est vide');
      return;
    }
    
    let message = "Bonjour Mojo Molado ! Je souhaite commander :\n\n";
    cart.forEach((item, i) => {
      const prixAffiche = item.price_display || (item.price + " FCFA");
      message += `${i + 1}. ${item.name} - ${prixAffiche} x${item.quantity}\n`;
    });
    
    message += `\nTotal : ${total.toLocaleString()} FCFA\n\nMerci !`;
    const whatsappUrl = `https://wa.me/221710433624?text=${encodeURIComponent(message)}`;
    
    fetch('https://mojomolado-api.onrender.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, total })
    }).then(() => {
      window.open(whatsappUrl, '_blank');
      clearCart();
      setIsCartOpen(false);
    }).catch(err => {
      console.error(err);
      alert("Erreur lors de la création de la commande.");
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsCartOpen(false)}>
      <div className="modal-content">
        <button className="close-modal" onClick={() => setIsCartOpen(false)}>&times;</button>
        <h2>Votre Panier</h2>
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {cart.map(item => (
            <div key={item.id} className="cart-item">
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: '14px', color: 'var(--text-color)', opacity: 0.7 }}>
                  {item.price_display || `${item.price} FCFA`} chacun
                </div>
              </div>
              <div className="cart-item-controls">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                <span>{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
              </div>
              <div style={{ textAlign: 'right', marginLeft: '16px' }}>
                <div style={{ fontWeight: 600 }}>{(item.price * item.quantity).toLocaleString()} FCFA</div>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  style={{ background: '#ff4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <p>Panier vide.</p>}
        </div>
        <p style={{ marginTop: '16px', fontSize: '18px' }}>
          <strong>Total: {total.toLocaleString()} FCFA</strong>
        </p>
        <button className="btn-checkout" onClick={handleCheckout}>Commander via WhatsApp</button>
      </div>
    </div>
  );
}

export default Cart;
