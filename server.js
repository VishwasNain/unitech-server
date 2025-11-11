require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const morgan = require('morgan');
const { Sequelize } = require('sequelize');
const db = require('./models');

// Import routes
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');

const app = express();

// Trust first proxy (important for rate limiting behind Render/Heroku/Nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { 
    success: false, 
    message: 'Too many requests from this IP, please try again later.' 
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use the X-Forwarded-For header if present, otherwise use the remote address
    return req.headers['x-forwarded-for'] || req.ip;
  }
});

// Apply rate limiting to all requests
app.use(limiter);

// CORS configuration
const allowedOrigins = [
  'https://unitechcomputer.vercel.app',
  'https://unitechcomputer-*.vercel.app',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

// CORS configuration with credentials support
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowed list or matches the pattern
    if (
      allowedOrigins.some(allowedOrigin => {
        const isAllowed = origin === allowedOrigin || 
          (allowedOrigin.includes('*') && 
           new RegExp(allowedOrigin.replace('*', '.*')).test(origin));
        return isAllowed;
      })
    ) {
      console.log('Allowed origin:', origin);
      return callback(null, true);
    }
    
    console.log('Blocked origin:', origin);
    const error = new Error('Not allowed by CORS');
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Cache-Control',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: [
    'Content-Length', 
    'X-Foo', 
    'X-Bar',
    'Content-Range',
    'X-Total-Count'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 200
};

// Apply CORS with credentials support
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Log CORS headers for debugging
app.use((req, res, next) => {
  res.on('finish', () => {
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': res.getHeader('access-control-allow-origin'),
      'Access-Control-Allow-Methods': res.getHeader('access-control-allow-methods'),
      'Access-Control-Allow-Headers': res.getHeader('access-control-allow-headers'),
      'Access-Control-Allow-Credentials': res.getHeader('access-control-allow-credentials')
    });
  });
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Make models available in request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.originalUrl}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle PostgreSQL errors
  if (err.code) {
    // Handle unique_violation
    if (err.code === '23505') {
      const detail = err.detail || 'A record with this data already exists';
      return res.status(409).json({
        success: false,
        message: 'Duplicate entry',
        details: detail
      });
    }
    
    // Handle foreign_key_violation
    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Reference error',
        details: err.detail || 'Referenced record not found'
      });
    }
    
    // Handle not_null_violation
    if (err.code === '23502') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: `Field '${err.column}' is required`
      });
    }
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      details: 'The provided token is invalid or expired'
    });
  }
  
  // Handle validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.errors.map(e => e.message)
    });
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
      errors: err.errors
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message: statusCode === 500 ? 'Something went wrong' : message
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// Database connection and server startup
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test the database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');

    // Sync all models with the database
    if (process.env.NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: true });
      console.log('🔄 Database synchronized');
    } else {
      await db.sequelize.sync();
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log(`🌐 API URL: http://localhost:${PORT}/api`);
      console.log(`📊 Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = { app, db };
