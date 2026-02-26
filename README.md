# Mojo Molado - Boutique de Mode Africaine

## Setup Instructions

### 1. Supabase Setup
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project" and fill in your project details
3. Wait for the project to be created (takes a few minutes)
4. Go to Settings > API in your Supabase dashboard
5. Copy your Project URL and anon/public key

### 2. Database Tables
Run this SQL in your Supabase SQL Editor:

```sql
-- Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  price_display TEXT NOT NULL,
  image TEXT NOT NULL,
  description TEXT,
  rating DECIMAL(2,1) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  low_stock_alert INTEGER DEFAULT 5,
  is_low_stock BOOLEAN DEFAULT FALSE,
  is_out_of_stock BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Admins table (for authentication)
CREATE TABLE admins (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sales table
CREATE TABLE sales (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  user_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Newsletter table
CREATE TABLE newsletter (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample products
INSERT INTO products (name, category, price, price_display, image, description, rating, stock) VALUES
('Robe beige', 'Vêtements', 15000, '15 000 FCFA', 'robes.images/robeBaige.jpg', 'Robe beige élégante en tissu africain.', 4.6, 10),
('Robe blanc et vert', 'Vêtements', 15000, '15 000 FCFA', 'robes.images/robeBlancVert.jpg', 'Robe blanche et verte au style raffiné.', 4.5, 8),
-- Add more products as needed
;

-- Enable Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed for your security requirements)
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Only admins can insert products" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Only admins can update products" ON products FOR UPDATE USING (auth.role() = 'authenticated');
-- Add similar policies for other tables
```

### 3. Update Configuration
1. Open `assets/js/config.js`
2. Replace `YOUR_SUPABASE_PROJECT_URL` with your actual project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key

### 4. How It Works
- **Products**: Loaded from Supabase instead of local JSON file
- **Admin Auth**: Uses Supabase Auth for secure login
- **Data Persistence**: Cart, wishlist, sales, and reviews saved to Supabase
- **Real-time**: Changes sync across all users

### 5. Deploy
Deploy to Netlify with your Supabase credentials as environment variables for security.

## Features
- Modern responsive design with dark/light theme
- Product catalog with search and filters
- Shopping cart and wishlist
- Admin panel for product management
- Sales tracking and reporting
- Newsletter subscription
- WhatsApp integration for orders

## Technologies
- HTML5, CSS3, JavaScript (ES6+)
- Supabase (Backend as a Service)
- Font Awesome icons
- Google Fonts
