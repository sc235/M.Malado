import React from 'react';

function Footer() {
  const subscribeNewsletter = (e) => {
    e.preventDefault();
    alert('Inscription réussie! Merci ! Vous recevrez bientôt nos offres et nouveautés.');
  };

  return (
    <>
      <section className="newsletter" style={{ textAlign: 'center', padding: '20px' }}>
        <h3>Newsletter</h3>
        <form className="newsletter-form" onSubmit={subscribeNewsletter} style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '16px auto', maxWidth: '400px' }}>
          <input 
            type="email" 
            placeholder="Votre email" 
            aria-label="Email newsletter"
            required
            style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', flex: 1 }}
          />
          <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', cursor: 'pointer' }}>S’abonner</button>
        </form>
      </section>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Mojo Molado — Dakar, Sandaga, Rue Thiong</p>
        <div className="social-links">
          <a href="https://www.tiktok.com/@mojomalado_?lang=fr" target="_blank" rel="noopener noreferrer" aria-label="Tiktok">
            <i className="fab fa-tiktok"></i>
          </a>
          <a href="https://wa.me/221776276363" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <i className="fab fa-whatsapp"></i>
          </a>
        </div>
      </footer>
    </>
  );
}

export default Footer;
