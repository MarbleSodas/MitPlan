const r = require('rethinkdb');

let connection = null;

const dbConfig = {
  host: process.env.RETHINKDB_HOST || '23.240.194.252',
  port: process.env.RETHINKDB_PORT || 28015,
  db: process.env.RETHINKDB_DB || 'mitplan_production',
  ssl: false, // Disable SSL for now to test connection
  timeout: 30,
  pool: {
    min: 10,
    max: 50
  }
};

const connectToDatabase = async () => {
  try {
    console.log('🔌 Connecting to RethinkDB...');
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`🗄️  Database: ${dbConfig.db}`);

    connection = await r.connect(dbConfig);
    console.log('✅ Connected to RethinkDB successfully');

    // Create database if it doesn't exist
    await createDatabaseIfNotExists();

    // Create tables if they don't exist
    await createTablesIfNotExist();

    console.log('🏗️  Database schema initialized');

  } catch (error) {
    console.error('❌ Failed to connect to RethinkDB:', error);
    process.exit(1);
  }
};

const createDatabaseIfNotExists = async () => {
  try {
    const dbList = await r.dbList().run(connection);
    if (!dbList.includes(dbConfig.db)) {
      await r.dbCreate(dbConfig.db).run(connection);
      console.log(`📊 Created database: ${dbConfig.db}`);
    }
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
};

const createTablesIfNotExist = async () => {
  const tables = [
    {
      name: 'users',
      indexes: ['email', 'google_id']
    },
    {
      name: 'plans',
      indexes: ['user_id', 'created_at', 'updated_at', 'is_public']
    },
    {
      name: 'plan_versions',
      indexes: ['plan_id', 'created_at']
    },
    {
      name: 'folders',
      indexes: ['user_id', 'parent_folder_id']
    },
    {
      name: 'sessions',
      indexes: ['user_id', 'expires_at']
    }
  ];

  try {
    const existingTables = await r.db(dbConfig.db).tableList().run(connection);

    for (const table of tables) {
      if (!existingTables.includes(table.name)) {
        await r.db(dbConfig.db).tableCreate(table.name).run(connection);
        console.log(`📋 Created table: ${table.name}`);

        // Create indexes
        if (table.indexes) {
          for (const index of table.indexes) {
            try {
              await r.db(dbConfig.db).table(table.name).indexCreate(index).run(connection);
              console.log(`🔍 Created index: ${table.name}.${index}`);
            } catch (indexError) {
              // Index might already exist, ignore error
              if (!indexError.message.includes('already exists')) {
                console.warn(`⚠️  Warning creating index ${table.name}.${index}:`, indexError.message);
              }
            }
          }

          // Wait for indexes to be ready
          await r.db(dbConfig.db).table(table.name).indexWait().run(connection);
        }
      }
    }
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const getConnection = () => {
  if (!connection) {
    throw new Error('Database connection not established. Call connectToDatabase() first.');
  }
  return connection;
};

const closeConnection = async () => {
  if (connection) {
    await connection.close();
    connection = null;
    console.log('🔌 Database connection closed');
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, closing database connection...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, closing database connection...');
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectToDatabase,
  getConnection,
  closeConnection,
  r
};
