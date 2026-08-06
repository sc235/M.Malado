-- ============================================================================
--  MOJO MALADO — Schéma de base de données (PostgreSQL)
--  Exécuté par `npm run migrate`. Idempotent : peut être relancé sans risque.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------- CATÉGORIES
CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image       TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------------ PRODUITS
CREATE TABLE IF NOT EXISTS products (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  base_price   INTEGER NOT NULL CHECK (base_price >= 0),   -- en FCFA, entier
  compare_at   INTEGER CHECK (compare_at >= 0),            -- prix barré (promo)
  rating       NUMERIC(2,1) NOT NULL DEFAULT 4.5,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);

-- --------------------------------------------------------- IMAGES DE PRODUIT
CREATE TABLE IF NOT EXISTS product_images (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  alt        TEXT,
  position   INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, position);

-- ---------------------------------------------------------------- VARIANTES
-- Une variante = une déclinaison vendable (taille + couleur), avec son stock.
CREATE TABLE IF NOT EXISTS product_variants (
  id         SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size       TEXT,
  color      TEXT,
  sku        TEXT UNIQUE,
  price      INTEGER CHECK (price >= 0),          -- NULL = on utilise base_price
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

-- ------------------------------------------------------------------ CLIENTES
CREATE TABLE IF NOT EXISTS customers (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS addresses (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT DEFAULT 'Domicile',
  line1       TEXT NOT NULL,
  city        TEXT NOT NULL DEFAULT 'Dakar',
  landmark    TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE
);

-- --------------------------------------------------------------------- ADMIN
CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT 'Administration',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------- COMMANDES
-- statuses : en_attente → confirmee → preparation → expediee → livree
--            (ou annulee à tout moment)
CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  reference      TEXT NOT NULL UNIQUE,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,

  -- Coordonnées figées au moment de la commande (une cliente peut changer
  -- d'adresse plus tard : la commande doit garder celle de l'époque).
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  address_line   TEXT NOT NULL,
  city           TEXT NOT NULL DEFAULT 'Dakar',
  note           TEXT,

  subtotal       INTEGER NOT NULL,
  shipping       INTEGER NOT NULL DEFAULT 0,
  total          INTEGER NOT NULL,

  status         TEXT NOT NULL DEFAULT 'en_attente',
  payment_method TEXT NOT NULL DEFAULT 'whatsapp',
  payment_status TEXT NOT NULL DEFAULT 'en_attente',  -- en_attente | paye | echoue | rembourse
  transaction_id TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created  ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id  INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,

  -- Copies figées : si le produit est renommé ou supprimé, la facture reste juste.
  name        TEXT NOT NULL,
  size        TEXT,
  color       TEXT,
  image       TEXT,
  unit_price  INTEGER NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);

-- Historique visible par la cliente sur la page de suivi.
CREATE TABLE IF NOT EXISTS order_events (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_order ON order_events(order_id, created_at);

-- --------------------------------------------------------------------- AVIS
CREATE TABLE IF NOT EXISTS reviews (
  id           SERIAL PRIMARY KEY,
  product_id   INTEGER REFERENCES products(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  author       TEXT NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, is_published);

-- --------------------------------------------------------------- CODES PROMO
-- kind : percent (% du sous-total) | amount (FCFA) | shipping (livraison offerte)
CREATE TABLE IF NOT EXISTS promo_codes (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,               -- toujours stocké en MAJUSCULES
  kind         TEXT NOT NULL DEFAULT 'percent' CHECK (kind IN ('percent','amount','shipping')),
  value        INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  min_subtotal INTEGER NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
  max_uses     INTEGER CHECK (max_uses IS NULL OR max_uses > 0),  -- NULL = illimité
  used_count   INTEGER NOT NULL DEFAULT 0,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colonnes ajoutées après coup : les commandes existaient déjà avant les promos.
-- ADD COLUMN IF NOT EXISTS garde la migration relançable sans risque.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------- NEWSLETTER
CREATE TABLE IF NOT EXISTS newsletter (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------- MISE À JOUR AUTO
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_touch ON products;
CREATE TRIGGER trg_products_touch BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_orders_touch ON orders;
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ------------------------------------------------------- VUE : STOCK PRODUIT
CREATE OR REPLACE VIEW product_stock AS
  SELECT p.id AS product_id,
         COALESCE(SUM(v.stock), 0)::INT AS total_stock,
         COUNT(v.id) FILTER (WHERE v.stock > 0 AND v.is_active)::INT AS available_variants
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id
  GROUP BY p.id;
