import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { catalog, SHOP } from '../lib/api';

export default function Footer() {
  const { notify } = useCart();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notify('Merci de saisir une adresse email valide.', 'error');
      return;
    }
    setBusy(true);
    try {
      await catalog.newsletter(email);
      setEmail('');
      notify('Merci ! Vous recevrez nos nouveautés en avant-première.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="newsletter-band">
        <div className="container newsletter-inner">
          <div>
            <p className="eyebrow" style={{ color: 'var(--sand)' }}>Le cercle Mojo</p>
            <h2>Les nouveautés,<br />avant tout le monde.</h2>
            <p>Nouveaux arrivages, pièces uniques et offres réservées à nos abonnées. Un message par semaine, jamais plus.</p>
          </div>
          <form className="newsletter-form" onSubmit={subscribe}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="Votre adresse email" aria-label="Adresse email" required />
            <button type="submit" className="btn" disabled={busy}>
              {busy ? <i className="fas fa-spinner fa-spin" aria-hidden="true" /> : <>S'abonner <i className="fas fa-arrow-right" aria-hidden="true" /></>}
            </button>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src="/logo-modjo.jpg" alt="Logo Mojo Malado" />
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                Own your roots,<br />wear your culture.
              </p>
              <p>Mode africaine contemporaine, sacs, sandales et parfums — sélectionnés pièce par pièce à Dakar.</p>
              <div className="social-links">
                <a href={SHOP.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <i className="fab fa-tiktok" aria-hidden="true" />
                </a>
                <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <i className="fab fa-whatsapp" aria-hidden="true" />
                </a>
                <a href={`mailto:${SHOP.email}`} aria-label="Email">
                  <i className="fas fa-envelope" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Boutique</h4>
              <ul>
                <li><Link to="/boutique">Toute la collection</Link></li>
                <li><Link to="/boutique?categorie=vetements">Vêtements</Link></li>
                <li><Link to="/boutique?categorie=sacs">Sacs</Link></li>
                <li><Link to="/boutique?categorie=parfums">Parfums</Link></li>
                <li><Link to="/boutique?categorie=sandales">Sandales</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Mon compte</h4>
              <ul>
                <li><Link to="/connexion">Se connecter</Link></li>
                <li><Link to="/inscription">Créer un compte</Link></li>
                <li><Link to="/compte/commandes">Mes commandes</Link></li>
                <li><Link to="/suivi">Suivre une commande</Link></li>
                <li><Link to="/secret-mojo-gate">Administration</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>La maison</h4>
              <ul>
                <li><Link to="/a-propos">Notre histoire</Link></li>
                <li><Link to="/a-propos#livraison">Livraison & retours</Link></li>
                <li><Link to="/a-propos#paiement">Moyens de paiement</Link></li>
                <li><Link to="/contact">Nous trouver</Link></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <ul>
                <li><span>{SHOP.address}</span></li>
                <li><a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer">{SHOP.whatsappDisplay}</a></li>
                <li><a href={`mailto:${SHOP.email}`}>{SHOP.email}</a></li>
                <li><span>Lun – Sam · 9h – 19h</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Mojo Malado — Tous droits réservés.</span>
            <div className="pay-badges">
              <span className="pay-badge">Wave</span>
              <span className="pay-badge">Orange Money</span>
              <span className="pay-badge">Free Money</span>
              <span className="pay-badge">Visa</span>
              <span className="pay-badge">Mastercard</span>
            </div>
          </div>
        </div>
      </footer>

      <a className="wa-float" href={`https://wa.me/${SHOP.whatsapp}`} target="_blank"
        rel="noopener noreferrer" aria-label="Nous écrire sur WhatsApp">
        <i className="fab fa-whatsapp" aria-hidden="true" />
      </a>
    </>
  );
}
