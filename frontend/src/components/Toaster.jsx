import React from 'react';
import { useCart } from '../contexts/CartContext';

const ICONS = {
  success: 'fas fa-circle-check',
  error: 'fas fa-circle-exclamation',
  info: 'fas fa-circle-info',
};

export default function Toaster() {
  const { toasts, dismissToast } = useCart();
  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`}>
          <i className={ICONS[toast.type] || ICONS.info} aria-hidden="true" />
          <span>{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fermer la notification"
          >
            <i className="fas fa-xmark" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
