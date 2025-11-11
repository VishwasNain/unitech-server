const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const basename = path.basename(__filename);
const db = {};

// Initialize Sequelize with environment variables
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
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
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

// Define model loading order to prevent circular dependencies
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
  if (fs.existsSync(path.join(__dirname, file))) {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  }
});

// Then import any remaining models that weren't in the ordered list
fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1 &&
      !modelFiles.includes(file) // Skip already loaded models
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Set up model associations if they exist
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Test the connection after all models are loaded
testConnection();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
