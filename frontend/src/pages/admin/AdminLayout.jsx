import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { setToken } from '../../lib/api';

const LINKS = [
  { to: '/gestion-mojo-privee',            icon: 'fas fa-chart-line', label: 'Tableau de bord', end: true },
  { to: '/gestion-mojo-privee/produits',   icon: 'fas fa-tags',       label: 'Produits & stock' },
  { to: '/gestion-mojo-privee/categories', icon: 'fas fa-folder-open', label: 'Collections' },
  { to: '/gestion-mojo-privee/commandes',  icon: 'fas fa-box',        label: 'Commandes' },
  { to: '/gestion-mojo-privee/clientes',   icon: 'fas fa-users',      label: 'Clientes' },
  { to: '/gestion-mojo-privee/avis',       icon: 'fas fa-star',       label: 'Avis' },
  { to: '/gestion-mojo-privee/promos',     icon: 'fas fa-tag',        label: 'Codes promo' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <div className="admin-brand">
          <img src="/logo-modjo.jpg" alt="" />
          <div>
            <strong>Mojo Malado</strong>
            <span>Administration</span>
          </div>
        </div>

        <div className="admin-store-link-wrap" style={{ padding: '0 16px 12px 16px' }}>
          <a href="/" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', borderRadius: '6px', fontSize: '0.9em', padding: '8px 12px' }}>
            <i className="fas fa-shopping-bag" aria-hidden="true" /> Aller au magasin
          </a>
        </div>

        <nav>
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}>
              <i className={link.icon} aria-hidden="true" /> {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-side-foot">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" /> Voir la boutique
          </a>
          <button type="button" onClick={() => { setToken(null, 'admin'); navigate('/secret-mojo-gate'); }}>
            <i className="fas fa-arrow-right-from-bracket" aria-hidden="true" /> Déconnexion
          </button>
        </div>
      </aside>

      {open && <div className="admin-overlay" onClick={() => setOpen(false)} />}

      <div className="admin-main">
        <button type="button" className="admin-burger" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          <i className="fas fa-bars" aria-hidden="true" />
        </button>
        <Outlet />
      </div>
    </div>
  );
}
