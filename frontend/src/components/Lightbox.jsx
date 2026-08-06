import React, { useCallback, useEffect, useState } from 'react';
import { imageUrl } from '../lib/format';

/* ============================================================================
   Visionneuse plein écran.

   Sur un site de mode, la photo est l'argument de vente : la cliente doit
   pouvoir juger le tissu et les finitions avant d'acheter. Sans agrandissement,
   elle abandonne ou écrit sur WhatsApp pour demander une photo de près.

   Navigation au clavier (flèches et Échap) comme à la souris et au doigt.
   ========================================================================== */

export default function Lightbox({ images, index, onClose, onChange }) {
  const [zoomed, setZoomed] = useState(false);
  const count = images.length;

  const go = useCallback((step) => {
    setZoomed(false);
    onChange((index + step + count) % count);
  }, [index, count, onChange]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && count > 1) go(1);
      if (e.key === 'ArrowLeft' && count > 1) go(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [go, onClose, count]);

  /* Balayage horizontal au doigt : l'essentiel du trafic vient du mobile. */
  const [touchX, setTouchX] = useState(null);
  const onTouchEnd = (e) => {
    if (touchX === null || count < 2) return;
    const delta = e.changedTouches[0].clientX - touchX;
    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
    setTouchX(null);
  };

  const current = images[index];

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photos du produit">
      <button type="button" className="close-modal lightbox-close" onClick={onClose} aria-label="Fermer">
        <i className="fas fa-xmark" aria-hidden="true" />
      </button>

      {count > 1 && (
        <>
          <button type="button" className="lightbox-nav prev" onClick={() => go(-1)} aria-label="Photo précédente">
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
          <button type="button" className="lightbox-nav next" onClick={() => go(1)} aria-label="Photo suivante">
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        className={`lightbox-stage ${zoomed ? 'is-zoomed' : ''}`}
        onClick={() => setZoomed((z) => !z)}
        onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
        onTouchEnd={onTouchEnd}
      >
        <img src={imageUrl(current?.url)} alt={current?.alt || ''} />
      </div>

      <div className="lightbox-foot">
        <span className="lightbox-hint">
          <i className={zoomed ? 'fas fa-magnifying-glass-minus' : 'fas fa-magnifying-glass-plus'} aria-hidden="true" />
          {zoomed ? 'Cliquez pour réduire' : 'Cliquez pour agrandir'}
        </span>
        {count > 1 && (
          <div className="lightbox-dots">
            {images.map((img, i) => (
              <button key={img.id || i} type="button"
                className={i === index ? 'active' : ''}
                onClick={() => { setZoomed(false); onChange(i); }}
                aria-label={`Photo ${i + 1} sur ${count}`}
                aria-current={i === index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
