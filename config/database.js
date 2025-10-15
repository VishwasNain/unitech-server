const { Sequelize } = require('sequelize');
const config = require('./config.json')[process.env.NODE_ENV || 'development'];

// Initialize Sequelize with configuration
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: 'postgres',
    port: config.port,
    logging: config.logging,
    dialectOptions: config.dialectOptions,
    pool: config.pool || {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

// Test connection on startup
if (process.env.NODE_ENV !== 'test') {
  testConnection().then(success => {
    if (!success) process.exit(1);
  });
}

module.exports = {
  sequelize,
  Sequelize,
  testConnection
};