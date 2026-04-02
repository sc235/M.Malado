import React from 'react';
import { useCart } from '../contexts/CartContext';

function Cart() {
  const { cart, removeFromCart, updateQuantity, isCartOpen, setIsCartOpen, clearCart } = useCart();
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  if (!isCartOpen) return null;

  const [paymentMethod, setPaymentMethod] = React.useState(''); // 'whatsapp' ou 'wave'
  const [customerInfo, setCustomerInfo] = React.useState({ name: '', phone: '', address: '' });

  const handleCheckout = (method) => {
    if (!cart.length) {
      alert('Votre panier est vide');
      return;
    }

    if (!customerInfo.name || !customerInfo.phone || !customerInfo.address) {
      alert('Veuillez remplir vos informations (Nom, Téléphone et Adresse) avant de commander.');
      return;
    }
    
    setPaymentMethod(method);

    let message = `Bonjour Mojo Molado ! Je souhaite commander :\n\n`;
    message += `👤 Client : ${customerInfo.name}\n📞 Tél : ${customerInfo.phone}\n📍 Adresse : ${customerInfo.address}\n\n`;
    message += "Articles :\n";
    cart.forEach((item, i) => {
      const prixAffiche = item.price_display || (item.price + " FCFA");
      message += `${i + 1}. ${item.name} - ${prixAffiche} x${item.quantity}\n`;
    });
    
    // Si méthode = wave, on l'ajoute au message pour le vendeur
    if (method === 'wave') {
      message += `\nTotal : ${total.toLocaleString()} FCFA\n\n*Paiement : Virement WAVE effectué.*`;
    } else {
      message += `\nTotal : ${total.toLocaleString()} FCFA\n\nMerci !`;
    }

    const whatsappUrl = `https://wa.me/221710433624?text=${encodeURIComponent(message)}`;
    
    // Si c'est juste un checkout WhatsApp normal, on redirige tout de suite
    if (method === 'whatsapp') {
      executeOrder(whatsappUrl);
    }
    // Si Wave, l'UI affichera les instructions, puis l'utilisateur cliquera "J'ai payé" pour déclencher executeOrder
  };

  const executeOrder = (whatsappUrl) => {
    // 1. Ouvrir WhatsApp immédiatement !
    if (whatsappUrl) window.open(whatsappUrl, '_blank');
    
    // 2. Vider le panier et fermer la fenêtre
    clearCart();
    setIsCartOpen(false);
    setPaymentMethod(''); // reset
    
    // 3. Enregistrer la commande en arrière-plan
    fetch('https://mojomalado-api.onrender.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart, total, method: paymentMethod, customerInfo })
    }).catch(err => {
      console.error("Erreur back-end ignorée:", err);
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target.className === 'modal-overlay') {
        setIsCartOpen(false);
        setPaymentMethod('');
      }
    }}>
      <div className="modal-content">
        <button className="close-modal" onClick={() => { setIsCartOpen(false); setPaymentMethod(''); }}>&times;</button>
        
        {paymentMethod === 'wave' ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Wave_logo.png/600px-Wave_logo.png" alt="Wave" style={{ height: '50px', marginBottom: '20px' }} />
            <h2 style={{ fontSize: '1.8rem', color: '#13B1E6', marginBottom: '20px' }}>Paiement via Wave</h2>
            
            <p style={{ fontSize: '1.1rem', marginBottom: '15px' }}>
              Montant à régler : <strong>{total.toLocaleString()} FCFA</strong>
            </p>

            <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '12px', margin: '20px 0', border: '1px solid var(--border-color)' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '10px' }}>Numéro du destinataire :</p>
              <div style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                71 043 36 24
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText('710433624');
                    alert('Numéro copié !');
                  }}
                  style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: 'var(--shadow-sm)' }}
                  title="Copier le numéro"
                >
                  <i className="far fa-copy"></i>
                </button>
              </div>
            </div>

            {/* Bouton pour tenter d'ouvrir l'application (surtout utile sur mobile) */}
            <a 
              href="wave://" 
              className="btn-checkout" 
              style={{ background: '#f3f4f6', color: '#13B1E6', border: '2px solid #13B1E6', marginTop: '10px', boxShadow: 'none' }}
            >
              <i className="fas fa-external-link-alt" style={{ marginRight: '8px' }}></i> Ouvrir l'application Wave
            </a>

            <p style={{ color: 'var(--text-muted)', margin: '30px 0 15px', fontSize: '0.95rem' }}>
              Une fois le transfert effectué depuis votre application, cliquez ci-dessous pour valider la commande.
            </p>
            <button 
              className="btn-checkout" 
              style={{ background: '#13B1E6', marginTop: 0 }}
              onClick={() => {
                let message = `Bonjour Mojo Molado ! Je souhaite commander :\n\n`;
                message += `👤 Client : ${customerInfo.name}\n📞 Tél : ${customerInfo.phone}\n📍 Adresse : ${customerInfo.address}\n\n`;
                message += "Articles :\n";
                cart.forEach((item, i) => {
                  message += `${i + 1}. ${item.name} x${item.quantity}\n`;
                });
                message += `\nTotal : ${total.toLocaleString()} FCFA\n\n*J'ai transféré le montant par Wave au 71 043 36 24. Voici ma confirmation.*`;
                const whatsappUrl = `https://wa.me/221710433624?text=${encodeURIComponent(message)}`;
                executeOrder(whatsappUrl);
              }}
            >
              <i className="fas fa-check-circle" style={{ marginRight: '8px' }}></i> J'ai effectué le paiement
            </button>
            <button 
              onClick={() => setPaymentMethod('')} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', marginTop: '15px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Retour au panier
            </button>
          </div>
        ) : (
          <>
            <h2>Votre Panier</h2>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
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
            
            {cart.length > 0 && (
              <div style={{ marginTop: '20px', padding: '20px', background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Vos informations de livraison :</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input 
                    type="text" 
                    placeholder="Votre Nom Complet" 
                    value={customerInfo.name} 
                    onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} 
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)' }}
                  />
                  <input 
                    type="tel" 
                    placeholder="Votre Téléphone" 
                    value={customerInfo.phone} 
                    onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})} 
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)' }}
                  />
                  <input 
                    type="text" 
                    placeholder="Votre Adresse de Livraison" 
                    value={customerInfo.address} 
                    onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})} 
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--surface-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            )}

            <p style={{ marginTop: '16px', fontSize: '1.8rem', textAlign: 'right' }}>
              <strong>Total: {total.toLocaleString()} FCFA</strong>
            </p>
            
            {cart.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                <button 
                  className="btn-checkout" 
                  style={{ background: '#13B1E6', margin: 0, boxShadow: '0 4px 15px rgba(19, 177, 230, 0.4)' }} 
                  onClick={() => handleCheckout('wave')}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Wave_logo.png/600px-Wave_logo.png" alt="Wave" style={{ height: '24px', marginRight: '8px', filter: 'brightness(0) invert(1)' }} />
                  Payer avec Wave
                </button>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></span>
                  <span style={{ padding: '0 10px' }}>OU</span>
                  <span style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></span>
                </div>
                <button 
                  className="btn-checkout" 
                  style={{ background: '#25D366', margin: 0 }} 
                  onClick={() => handleCheckout('whatsapp')}
                >
                  <i className="fab fa-whatsapp" style={{ fontSize: '1.4rem', marginRight: '8px' }}></i> Commander via WhatsApp
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
