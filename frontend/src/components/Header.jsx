import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../supabaseClient';

function Header() {
  const { cart, wishlist, setIsCartOpen, setIsWishlistOpen } = useCart();
  const [theme, setTheme] = useState('light');
  const [session, setSession] = useState(null);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const wishlistCount = wishlist.length;

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <>
      <header className="header">
        <button className="theme-toggle" aria-label="Changer le thème" onClick={toggleTheme}>
          <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
        </button>
        <div className="header-content">
          <img src="/logo-modjo.jpg" alt="Logo Mojo Molado" className="header-logo" />
          <div>
            <h1>Mojo Molado</h1>
            <p className="tagline">Own your roots, Wear your culture</p>
            <p className="tagline">L’élégance africaine à portée de main</p>
          </div>
        </div>
        <nav className="nav" aria-label="Navigation principale">
          <Link to="/"><button>Accueil</button></Link>
          <Link to="/#shop"><button>Boutique</button></Link>
          <Link to="/#about"><button>À propos</button></Link>
          <Link to="/#contact"><button>Contact</button></Link>
          {session && (
            <Link to="/gestion-mojo-privee"><button>Admin</button></Link>
          )}
        </nav>
      </header>

      <div className="icons">
        <button className="icon-button" onClick={() => setIsWishlistOpen(true)} aria-label="Voir les favoris">
          <i className="fas fa-heart" aria-hidden="true"></i>
          <span className="badge">{wishlistCount}</span>
        </button>
        <button className="icon-button" onClick={() => setIsCartOpen(true)} aria-label="Voir le panier">
          <i className="fas fa-shopping-cart" aria-hidden="true"></i>
          <span className="badge">{cartCount}</span>
        </button>
      </div>
    </>
  );
}

export default Header;
