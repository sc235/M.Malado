import React from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';
import { SHOP } from '../lib/api';
import Seo from '../components/Seo';

export default function About() {
  return (
    <main>
      <Seo
        title="Notre histoire"
        description="Mojo Malado est née au coeur du marché Sandaga, à Dakar, d'une passion pour l'artisanat africain. Découvrez la maison, ses valeurs et sa sélection."
      />
      <header className="page-hero">
        <div className="container">
          <p className="eyebrow">La maison</p>
          <h1>Own your roots,<br />wear your culture.</h1>
          <p>
            Mojo Malado est née d'une conviction simple : la mode africaine mérite
            d'être portée avec fierté, au quotidien.
          </p>
        </div>
      </header>

      <section className="section">
        <div className="container-narrow">
          <Reveal>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', lineHeight: 1.6, marginBottom: 26 }}>
              Au cœur du marché Sandaga, rue Thiong, notre boutique réunit des vêtements
              de créateur, des sacs élégants et des parfums envoûtants.
            </p>
            <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>
              Chaque pièce est choisie à la main, pour sa qualité de tissu, ses finitions
              et son charme authentique. Nous travaillons avec des artisans et des
              fournisseurs de confiance, et nous vérifions chaque article avant qu'il
              ne rejoigne la collection.
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              Chez Mojo Malado, la mode est bien plus que des vêtements : c'est une façon
              de s'exprimer, avec confiance, fierté et identité.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section-alt" id="livraison">
        <div className="container">
          <Reveal className="section-head section-head-center">
            <p className="eyebrow">Praticité</p>
            <h2 className="section-title">Livraison & <em>retours</em></h2>
          </Reveal>
          <div className="value-grid" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {[
              { icon: 'fas fa-location-dot', title: 'Dakar', text: 'Livraison en 24h. Offerte dès 50 000 FCFA d\'achat.' },
              { icon: 'fas fa-map', title: 'Régions', text: '48 à 72h partout au Sénégal, via nos partenaires transporteurs.' },
              { icon: 'fas fa-rotate-left', title: 'Échange', text: 'Un souci de taille ? Échange possible sous 48h, article non porté.' },
              { icon: 'fas fa-box-open', title: 'Suivi', text: 'Vous recevez un message WhatsApp à chaque étape de la commande.' },
            ].map((v) => (
              <div className="value-item" key={v.title}>
                <i className={v.icon} aria-hidden="true" />
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="paiement">
        <div className="container">
          <Reveal className="section-head section-head-center">
            <p className="eyebrow">En toute confiance</p>
            <h2 className="section-title">Moyens de <em>paiement</em></h2>
            <p className="section-desc">
              Payez comme vous en avez l'habitude. Aucune donnée bancaire n'est
              conservée sur notre site.
            </p>
          </Reveal>

          <div className="review-grid">
            {[
              { icon: 'fas fa-water', cls: 'wave', name: 'Wave', desc: 'Le moyen de paiement le plus utilisé au Sénégal. Instantané et sans frais côté client.' },
              { icon: 'fas fa-mobile-screen', cls: 'om', name: 'Orange Money', desc: 'Payez directement depuis votre compte Orange Money, en quelques secondes.' },
              { icon: 'fas fa-credit-card', cls: 'card', name: 'Carte bancaire', desc: 'Visa et Mastercard, avec authentification 3-D Secure. Idéal depuis l\'étranger.' },
              { icon: 'fas fa-hand-holding-dollar', cls: 'wa', name: 'À la livraison', desc: 'Sur Dakar, réglez en espèces au moment de la réception de votre commande.' },
            ].map((p) => (
              <div className="review-card" key={p.name}>
                <span className={`pay-logo ${p.cls}`} style={{ width: 44, height: 44, fontSize: '1.1rem' }}>
                  <i className={p.icon} aria-hidden="true" />
                </span>
                <h3 style={{ fontFamily: 'var(--font-body)', fontSize: '1.05rem' }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <Reveal>
            <h2 className="section-title" style={{ marginBottom: 16 }}>Venez nous voir</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 26 }}>{SHOP.address}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/boutique" className="btn">Voir la collection</Link>
              <Link to="/contact" className="btn btn-ghost">Nous contacter</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
