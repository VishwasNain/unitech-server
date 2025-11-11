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
  'Product.js',
  'Order.js',
  'OrderItem.js',
  'Cart.js',
  'CartItem.js',
  'Wishlist.js',
  'Review.js',
  'Newsletter.js',
  'ShippingAddress.js'
];

// Import models in the defined order
modelFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const model = require(filePath)(sequelize, DataTypes);
    db[model.name] = model;
  }
});

// Load any additional models not explicitly listed
fs.readdirSync(__dirname)
  .filter(file =>
    file.indexOf('.') !== 0 &&
    file !== basename &&
    file.slice(-3) === '.js' &&
    !modelFiles.includes(file)
  )
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    db[model.name] = model;
  });

// Setup associations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

console.log('✅ Loaded models:', Object.keys(db));

testConnection();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;