const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const basename = path.basename(__filename);
const db = {};

// Initialize Sequelize with environment variables
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Test the database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Define model loading order to avoid circular dependencies
const modelFiles = [
  'User.js',
  'Address.js',
  'Product.js',
  'Review.js',
  'Cart.js',
  'CartItem.js',
  'Order.js',
  'OrderItem.js',
  'ShippingAddress.js',
  'Wishlist.js',
  'Newsletter.js'
];

// First, initialize all models without associations
modelFiles.forEach(file => {
  try {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const model = require(filePath)(sequelize, DataTypes);
      if (model && model.name) {
        db[model.name] = model;
      }
    }
  } catch (error) {
    console.error(`Error loading model ${file}:`, error);
  }
});

// Then set up associations
Object.keys(db).forEach(modelName => {
  if (db[modelName] && typeof db[modelName].associate === 'function') {
    try {
      db[modelName].associate(db);
    } catch (error) {
      console.error(`Error setting up associations for ${modelName}:`, error);
    }
  }
});

console.log('✅ Loaded models:', Object.keys(db));

testConnection();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;