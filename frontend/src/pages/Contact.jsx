import React, { useState } from 'react';
import Reveal from '../components/Reveal';
import { useCart } from '../contexts/CartContext';
import { SHOP, waLink } from '../lib/api';
import Seo from '../components/Seo';

export default function Contact() {
  const { notify } = useCart();
  const [form, setForm] = useState({ name: '', subject: '', message: '' });

  const send = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) {
      notify('Merci de renseigner votre nom et votre message.', 'error');
      return;
    }
    const msg = [
      `Bonjour Mojo Malado !`,
      '',
      `De : ${form.name}`,
      form.subject ? `Sujet : ${form.subject}` : '',
      '',
      form.message,
    ].filter(Boolean).join('\n');
    window.open(waLink(msg), '_blank', 'noopener');
    setForm({ name: '', subject: '', message: '' });
    notify('Message ouvert dans WhatsApp.');
  };

  return (
    <main>
      <Seo
        title="Nous contacter"
        description="Écrivez-nous sur WhatsApp au +221 71 043 36 24 ou passez à la boutique : Marché Sandaga, rue Thiong, Dakar. Ouvert du lundi au samedi, 9h-19h."
      />
      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">Contact</p>
          <h1>Parlons de votre<br />prochaine pièce.</h1>
          <p>Une question sur une taille, une couleur, un délai ? Nous répondons en quelques minutes.</p>
        </div>
      </header>

      <section className="section">
        <div className="container" style={{ display: 'grid', gap: 'clamp(28px, 5vw, 64px)', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
          <Reveal>
            <h2 className="section-title" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', marginBottom: 24 }}>
              Nous <em>trouver</em>
            </h2>

            <div className="pd-block" style={{ borderTop: 0, paddingTop: 0 }}>
              <h4>Boutique</h4>
              <p>{SHOP.address}<br />Lun – Sam · 9h – 19h</p>
            </div>

            <div className="pd-block">
              <h4>WhatsApp</h4>
              <p>
                <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer" className="link-underline">
                  {SHOP.whatsappDisplay}
                </a>
              </p>
            </div>

            <div className="pd-block">
              <h4>Email</h4>
              <p>
                <a href={`mailto:${SHOP.email}`} className="link-underline">{SHOP.email}</a>
              </p>
            </div>

            <div className="pd-block">
              <h4>Réseaux</h4>
              <div className="social-links" style={{ marginTop: 4 }}>
                <a href={SHOP.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                  <i className="fab fa-tiktok" aria-hidden="true" />
                </a>
                <a href={`https://wa.me/${SHOP.whatsapp}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                  <i className="fab fa-whatsapp" aria-hidden="true" />
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <form
              onSubmit={send}
              style={{
                background: 'var(--surface-solid)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: 'clamp(24px, 3vw, 36px)',
              }}
            >
              <h2 style={{ fontSize: '1.3rem', marginBottom: 18 }}>Écrivez-nous</h2>

              <div className="field">
                <label htmlFor="ct-name">Votre nom</label>
                <input id="ct-name" type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex : Awa Diop" />
              </div>

              <div className="field">
                <label htmlFor="ct-subject">Sujet</label>
                <input id="ct-subject" type="text" value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Disponibilité d'une robe…" />
              </div>

              <div className="field">
                <label htmlFor="ct-message">Message</label>
                <textarea id="ct-message" rows="5" value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Bonjour, je voudrais savoir…" />
              </div>

              <button type="submit" className="btn btn-wa btn-block">
                <i className="fab fa-whatsapp" aria-hidden="true" /> Envoyer sur WhatsApp
              </button>
              <p className="field-hint" style={{ textAlign: 'center' }}>
                Votre message s'ouvrira dans WhatsApp, prêt à être envoyé.
              </p>
            </form>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
