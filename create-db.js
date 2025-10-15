const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const config = require('./config/config.json');
const dbConfig = config.development;

async function createDatabase() {
  try {
    // Build connection string without database name
    const connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/postgres`;
    
    console.log('Creating database...');
    
    // Create database using psql command
    const { stdout, stderr } = await execAsync(
      `psql "${connectionString}" -c "CREATE DATABASE ${dbConfig.database};"`
    );
    
    if (stderr) {
      console.error('Error creating database:', stderr);
      if (stderr.includes('already exists')) {
        console.log('Database already exists. Continuing...');
        return true;
      }
      return false;
    }
    
    console.log('Database created successfully!');
    return true;
  } catch (error) {
    console.error('Error creating database:', error.message);
    console.log('\nMake sure you have PostgreSQL installed and running.');
    console.log('You can also create the database manually using pgAdmin or another PostgreSQL client.');
    console.log('Database name should be:', dbConfig.database);
    return false;
  }
}

// Run the function
createDatabase().then(success => {
  if (success) {
    console.log('You can now run: npx sequelize-cli db:migrate');
  } else {
    console.log('\nAlternative: You can download and install pgAdmin from https://www.pgadmin.org/');
    console.log('Then create a database named:', dbConfig.database);
  }
});
