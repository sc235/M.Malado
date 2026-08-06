import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { SHOP } from '../lib/api';

const CartContext = createContext(null);

/* Une ligne de panier = une DÉCLINAISON (taille + couleur), pas un produit.
   Deux tailles d'une même robe sont donc deux lignes distinctes. */
const read = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => read('mojo_cart_v2', []));
  const [wishlist, setWishlist] = useState(() => read('mojo_wishlist_v2', []));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(0);

  useEffect(() => { localStorage.setItem('mojo_cart_v2', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('mojo_wishlist_v2', JSON.stringify(wishlist)); }, [wishlist]);

  useEffect(() => {
    document.body.classList.toggle('no-scroll', isCartOpen || isWishlistOpen);
    return () => document.body.classList.remove('no-scroll');
  }, [isCartOpen, isWishlistOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setIsCartOpen(false);
      setIsWishlistOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ------------------------------------------------------------ Notifications */
  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback((message, type = 'success') => {
    const id = ++nextToastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  /* ------------------------------------------------------------------ Panier */
  const addToCart = useCallback((product, variant, quantity = 1) => {
    if (!variant?.id) {
      notify('Choisissez une taille avant d\'ajouter au panier.', 'error');
      return false;
    }

    let refused = false;

    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === variant.id);
      const already = existing?.quantity || 0;
      const max = Number(variant.stock) || 0;

      if (already + quantity > max) {
        refused = true;
        return prev;
      }

      if (existing) {
        return prev.map((l) =>
          l.variantId === variant.id ? { ...l, quantity: l.quantity + quantity } : l
        );
      }

      return [...prev, {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image || product.images?.[0]?.url,
        size: variant.size || null,
        color: variant.color || null,
        price: Number(variant.price ?? product.base_price),
        stock: max,
        quantity,
      }];
    });

    if (refused) {
      notify(
        Number(variant.stock) > 0
          ? `Stock limité : ${variant.stock} exemplaire(s) disponible(s).`
          : 'Cette déclinaison est épuisée.',
        'error'
      );
      return false;
    }

    notify(`${product.name}${variant.size ? ` · ${variant.size}` : ''} ajouté au panier`);
    return true;
  }, [notify]);

  const removeFromCart = useCallback(
    (variantId) => setCart((prev) => prev.filter((l) => l.variantId !== variantId)),
    []
  );

  const updateQuantity = useCallback((variantId, quantity) => {
    setCart((prev) => {
      if (quantity < 1) return prev.filter((l) => l.variantId !== variantId);
      return prev.map((l) =>
        l.variantId === variantId ? { ...l, quantity: Math.min(quantity, l.stock || 99) } : l
      );
    });
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  /* ----------------------------------------------------------------- Favoris */
  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      notify(exists ? 'Retiré des favoris' : `${product.name} ajouté aux favoris`);
      return exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, {
            id: product.id, slug: product.slug, name: product.name,
            image: product.image || product.images?.[0]?.url,
            base_price: product.base_price, category: product.category,
          }];
    });
  }, [notify]);

  const isInWishlist = useCallback((id) => wishlist.some((p) => p.id === id), [wishlist]);

  /* ------------------------------------------------------------------ Totaux */
  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.quantity, 0), [cart]);
  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.price * l.quantity, 0), [cart]);

  const shippingFor = useCallback((city = 'Dakar') => {
    if (subtotal === 0 || subtotal >= SHOP.freeShippingFrom) return 0;
    return /dakar|pikine|guediawaye|rufisque|keur massar/i.test(city)
      ? SHOP.shippingDakar
      : SHOP.shippingRegions;
  }, [subtotal]);

  const value = useMemo(() => ({
    cart, wishlist, cartCount, subtotal, shippingFor,
    addToCart, removeFromCart, updateQuantity, clearCart,
    toggleWishlist, isInWishlist,
    isCartOpen, setIsCartOpen, isWishlistOpen, setIsWishlistOpen,
    toasts, notify, dismissToast,
  }), [
    cart, wishlist, cartCount, subtotal, shippingFor,
    addToCart, removeFromCart, updateQuantity, clearCart,
    toggleWishlist, isInWishlist, isCartOpen, isWishlistOpen,
    toasts, notify, dismissToast,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart doit être utilisé dans <CartProvider>');
  return ctx;
}
