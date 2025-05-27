const r = require('rethinkdb');
require('dotenv').config();

// RethinkDB connection configuration
const config = {
  host: process.env.RETHINK_HOST || '23.240.194.252',
  port: process.env.RETHINK_PORT || 28015,
  db: process.env.RETHINK_DB || 'mitplan',
  user: process.env.RETHINK_USER || 'admin',
  password: process.env.RETHINK_PASSWORD || ''
};

// Connection pool
let connectionPool = [];
const MAX_POOL_SIZE = 10;

/**
 * Initialize the database connection and create tables if they don't exist
 */
async function initDb() {
  try {
    console.log(`Connecting to RethinkDB at ${config.host}:${config.port}`);
    const connection = await r.connect(config);

    // Create database if it doesn't exist
    const dbList = await r.dbList().run(connection);
    if (!dbList.includes(config.db)) {
      console.log(`Creating database: ${config.db}`);
      await r.dbCreate(config.db).run(connection);
    }

    // Switch to the database
    connection.use(config.db);

    // Create tables if they don't exist
    const tables = await r.tableList().run(connection);

    // Users table
    if (!tables.includes('users')) {
      console.log('Creating users table');
      await r.tableCreate('users').run(connection);
      await r.table('users').indexCreate('email').run(connection);
      await r.table('users').indexWait('email').run(connection);
    }

    // Plans table
    if (!tables.includes('plans')) {
      console.log('Creating plans table');
      await r.tableCreate('plans').run(connection);
      await r.table('plans').indexCreate('userId').run(connection);
      await r.table('plans').indexCreate('sharedWith', { multi: true }).run(connection);
      await r.table('plans').indexWait('userId', 'sharedWith').run(connection);
    }

    // Versions table
    if (!tables.includes('versions')) {
      console.log('Creating versions table');
      await r.tableCreate('versions').run(connection);
      await r.table('versions').indexCreate('planId').run(connection);
      await r.table('versions').indexWait('planId').run(connection);
    }

    // Verification tokens table
    if (!tables.includes('verification_tokens')) {
      console.log('Creating verification_tokens table');
      await r.tableCreate('verification_tokens').run(connection);
      await r.table('verification_tokens').indexCreate('token').run(connection);
      await r.table('verification_tokens').indexCreate('userId').run(connection);
      await r.table('verification_tokens').indexWait('token', 'userId').run(connection);
    }

    // Password reset tokens table
    if (!tables.includes('password_reset_tokens')) {
      console.log('Creating password_reset_tokens table');
      await r.tableCreate('password_reset_tokens').run(connection);
      await r.table('password_reset_tokens').indexCreate('token').run(connection);
      await r.table('password_reset_tokens').indexCreate('userId').run(connection);
      await r.table('password_reset_tokens').indexWait('token', 'userId').run(connection);
    }

    // Active sessions table for real-time collaboration
    if (!tables.includes('active_sessions')) {
      console.log('Creating active_sessions table');
      await r.tableCreate('active_sessions').run(connection);
      await r.table('active_sessions').indexCreate('planId').run(connection);
      await r.table('active_sessions').indexCreate('userId').run(connection);
      await r.table('active_sessions').indexWait('planId', 'userId').run(connection);
    }

    // User selections table for collaborative selection highlighting
    if (!tables.includes('user_selections')) {
      console.log('Creating user_selections table');
      await r.tableCreate('user_selections').run(connection);
      await r.table('user_selections').indexCreate('planId').run(connection);
      await r.table('user_selections').indexCreate('userId').run(connection);
      await r.table('user_selections').indexWait('planId', 'userId').run(connection);
    }

    // Operation history table for conflict resolution
    if (!tables.includes('operations')) {
      console.log('Creating operations table');
      await r.tableCreate('operations').run(connection);
      await r.table('operations').indexCreate('planId').run(connection);
      await r.table('operations').indexCreate('timestamp').run(connection);
      await r.table('operations').indexWait('planId', 'timestamp').run(connection);
    }

    console.log('Database initialization complete');

    // Initialize connection pool
    connectionPool.push(connection);
    for (let i = 1; i < MAX_POOL_SIZE; i++) {
      const conn = await r.connect(config);
      conn.use(config.db);
      connectionPool.push(conn);
    }

    console.log(`Connection pool initialized with ${connectionPool.length} connections`);

    return connection;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Get a connection from the pool
 */
async function getConnection() {
  if (connectionPool.length === 0) {
    // If pool is empty, create a new connection
    const connection = await r.connect(config);
    connection.use(config.db);
    return connection;
  }

  // Get a connection from the pool
  return connectionPool.pop();
}

/**
 * Release a connection back to the pool
 */
function releaseConnection(connection) {
  if (connectionPool.length < MAX_POOL_SIZE) {
    connectionPool.push(connection);
  } else {
    // If pool is full, close the connection
    connection.close();
  }
}

module.exports = {
  r,
  config,
  initDb,
  getConnection,
  releaseConnection
};