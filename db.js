const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { 
    rejectUnauthorized: false 
  }
});

// Test the database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL database:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database at', res.rows[0].now);
  }
});

module.exports = {
  query: (text, params) => {
    console.log('Executing query:', { text, params });
    return pool.query(text, params);
  },
  getClient: async () => {
    const client = await pool.connect();
    const query = client.query;
    const release = client.release;
    
    // Set a timeout of 5 seconds
    const timeout = setTimeout(() => {
      console.error('A client has been checked out for more than 5 seconds!');
    }, 5000);

    // Override the release method
    client.release = () => {
      clearTimeout(timeout);
      client.query = query;
      client.release = release;
      return release.apply(client);
    };

    return client;
  }
};

// Handle database errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});
