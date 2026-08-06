import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import { CartProvider } from './contexts/CartContext';
import { AuthProvider } from './contexts/AuthContext';
import { RequireCustomer, RequireAdmin } from './components/Guards';

import Header from './components/Header';
import Footer from './components/Footer';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import Toaster from './components/Toaster';

import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import About from './pages/About';
import Contact from './pages/Contact';
import Track from './pages/Track';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import Login from './pages/account/Login';
import Register from './pages/account/Register';
import Account from './pages/account/Account';
import Orders from './pages/account/Orders';

/* L'administration est un second site : elle n'est téléchargée que par
   la personne qui s'y connecte, jamais par les visiteuses de la boutique. */
const AdminLogin    = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout   = lazy(() => import('./pages/admin/AdminLayout'));
const Dashboard     = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const ProductForm   = lazy(() => import('./pages/admin/ProductForm'));
const AdminOrders   = lazy(() => import('./pages/admin/Orders'));
const OrderDetail   = lazy(() => import('./pages/admin/OrderDetail'));
const Customers     = lazy(() => import('./pages/admin/Customers'));
const AdminReviews  = lazy(() => import('./pages/admin/Reviews'));
const AdminPromos   = lazy(() => import('./pages/admin/Promos'));
const AdminCategories = lazy(() => import('./pages/admin/Categories'));

const Spinner = () => <div className="loader"><div className="loader-spinner" /></div>;

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); return; }
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash]);
  return null;
}

function NotFound() {
  return (
    <main className="container" style={{ padding: '110px 0' }}>
      <div className="empty-state">
        <i className="fas fa-compass" aria-hidden="true" />
        <h3>Page introuvable</h3>
        <p>L'adresse demandée n'existe pas ou a été déplacée.</p>
        <a href="/" className="btn">Retour à l'accueil</a>
      </div>
    </main>
  );
}

/* La boutique et l'administration n'ont ni le même en-tête ni le même pied
   de page : on sépare les deux mises en page. */
function StoreLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <Cart />
      <Wishlist />
    </>
  );
}

const store = (element) => <StoreLayout>{element}</StoreLayout>;

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Suspense fallback={<Spinner />}>
            <Routes>
              {/* ------------------------------------------------- Boutique */}
              <Route path="/"             element={store(<Home />)} />
              <Route path="/boutique"     element={store(<Shop />)} />
              <Route path="/produit/:key" element={store(<Product />)} />
              <Route path="/a-propos"     element={store(<About />)} />
              <Route path="/contact"      element={store(<Contact />)} />

              {/* -------------------------------------------------- Comptes */}
              <Route path="/connexion"   element={store(<Login />)} />
              <Route path="/inscription" element={store(<Register />)} />
              <Route path="/compte"      element={store(<RequireCustomer><Account /></RequireCustomer>)} />
              <Route path="/compte/commandes" element={store(<RequireCustomer><Orders /></RequireCustomer>)} />

              {/* ------------------------------------------ Tunnel d'achat */}
              <Route path="/commande"            element={store(<Checkout />)} />
              <Route path="/merci/:reference"    element={store(<Confirmation />)} />

              {/* ---------------------------------------------------- Suivi */}
              <Route path="/suivi" element={store(<Track />)} />
              <Route path="/commande/:reference" element={store(<Track />)} />

              {/* -------------------------------------------- Administration */}
              <Route path="/secret-mojo-gate" element={<AdminLogin />} />
              <Route path="/gestion-mojo-privee" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
                <Route index element={<Dashboard />} />
                <Route path="produits" element={<AdminProducts />} />
                <Route path="produits/nouveau" element={<ProductForm />} />
                <Route path="produits/:id" element={<ProductForm />} />
                <Route path="commandes" element={<AdminOrders />} />
                <Route path="commandes/:id" element={<OrderDetail />} />
                <Route path="clientes" element={<Customers />} />
                <Route path="avis" element={<AdminReviews />} />
                <Route path="promos" element={<AdminPromos />} />
                <Route path="categories" element={<AdminCategories />} />
              </Route>

              <Route path="*" element={store(<NotFound />)} />
            </Routes>
          </Suspense>
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
