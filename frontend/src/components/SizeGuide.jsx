import React, { useEffect } from 'react';

/* ============================================================================
   Guide des tailles.

   Première cause de retour dans le prêt-à-porter : la taille. Un tableau de
   correspondances évite l'échange — et le message WhatsApp « ça taille
   comment ? » avant chaque commande.

   Mesures en centimètres, correspondances françaises.
   ========================================================================== */

const GUIDES = {
  'Vêtements': {
    title: 'Robes et tenues',
    columns: ['Taille', 'FR', 'Poitrine', 'Taille (cm)', 'Hanches'],
    rows: [
      ['XS', '34', '82 – 85', '62 – 65', '88 – 91'],
      ['S',  '36', '86 – 89', '66 – 69', '92 – 95'],
      ['M',  '38', '90 – 93', '70 – 73', '96 – 99'],
      ['L',  '40', '94 – 98', '74 – 78', '100 – 104'],
      ['XL', '42', '99 – 103', '79 – 83', '105 – 109'],
      ['XXL', '44', '104 – 109', '84 – 89', '110 – 115'],
    ],
    tips: [
      'Mesurez-vous par-dessus des sous-vêtements fins, sans serrer le mètre.',
      'Entre deux tailles, prenez la plus grande : nos coupes sont ajustées.',
      'Les tissus wax et pagne ne se détendent pas à l\'usage.',
    ],
  },
  'Sandales': {
    title: 'Sandales et chaussures',
    columns: ['Pointure', 'Longueur du pied'],
    rows: [
      ['36', '22,5 cm'], ['37', '23,3 cm'], ['38', '24,0 cm'],
      ['39', '24,8 cm'], ['40', '25,5 cm'], ['41', '26,3 cm'], ['42', '27,0 cm'],
    ],
    tips: [
      'Mesurez le pied debout, en fin de journée : il est alors le plus large.',
      'Posez le talon contre un mur et mesurez jusqu\'au bout du plus long orteil.',
    ],
  },
};

export default function SizeGuide({ category, onClose }) {
  const guide = GUIDES[category] || GUIDES['Vêtements'];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content size-guide" role="dialog" aria-modal="true"
        aria-label="Guide des tailles" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="close-modal" onClick={onClose} aria-label="Fermer">
          <i className="fas fa-xmark" aria-hidden="true" />
        </button>

        <p className="eyebrow">Guide des tailles</p>
        <h2 className="size-guide-title">{guide.title}</h2>

        <div className="size-table-wrap">
          <table className="size-table">
            <thead>
              <tr>{guide.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) => (
                    i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="size-tips">
          {guide.tips.map((tip) => (
            <li key={tip}><i className="fas fa-circle-info" aria-hidden="true" />{tip}</li>
          ))}
        </ul>

        <p className="field-hint" style={{ textAlign: 'center', marginTop: 18 }}>
          Un doute ? Écrivez-nous, nous vous conseillons avec plaisir.
        </p>
      </div>
    </div>
  );
}
