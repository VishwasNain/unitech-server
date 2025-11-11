-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  image VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(275) UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cost_per_item DECIMAL(10, 2),
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  track_quantity BOOLEAN DEFAULT true,
  quantity INTEGER DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT false,
  is_on_sale BOOLEAN DEFAULT false,
  seo_title VARCHAR(100),
  seo_description VARCHAR(320),
  seo_keywords VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(100) UNIQUE,
  barcode VARCHAR(100),
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
