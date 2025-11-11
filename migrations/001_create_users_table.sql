-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  mobile VARCHAR(15) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  is_verified BOOLEAN NOT NULL DEFAULT false,
  email_verification_token VARCHAR(255),
  email_verification_expires TIMESTAMP,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP,
  mobile_verification_code VARCHAR(10),
  mobile_verification_expires TIMESTAMP,
  otp_attempts INTEGER DEFAULT 0,
  otp_blocked_until TIMESTAMP,
  last_login TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  profile_picture VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  pincode VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_status ON users(status);
