import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type ConnectionOptions } from 'mysql2/promise';
import * as schema from './schema.js';

export function require_database_url(value: string | undefined): string {
  if (!value) {
    throw new Error('DATABASE_URL is required in backend/.env');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    // malformed urls and their credentials stay out of error logs
    throw new Error('DATABASE_URL must be a valid mysql connection url');
  }
  if (url.protocol !== 'mysql:' || !url.hostname || url.pathname.length <= 1) {
    throw new Error('DATABASE_URL must identify a mysql database');
  }

  return value;
}

// production uses the RDS certificate bundle to verify the database server
export function database_connection_options(
  database_url = process.env['DATABASE_URL'],
  env: NodeJS.ProcessEnv = process.env,
): ConnectionOptions {
  const uri = require_database_url(database_url);
  const ca_file = env['DATABASE_SSL_CA_FILE'];
  if (env['NODE_ENV'] === 'production' && !ca_file) {
    throw new Error('DATABASE_SSL_CA_FILE is required in production');
  }

  return {
    uri,
    timezone: 'Z',
    charset: 'utf8mb4',
    ...(ca_file ? {
      ssl: {
        ca: readFileSync(ca_file, 'utf8'),
        rejectUnauthorized: true,
        verifyIdentity: true,
      },
    } : {}),
  };
}

// each backend process shares one pool, and pool.end() releases its connections
// connections open on demand, so /health does not depend on mysql
export function create_database(database_url = process.env['DATABASE_URL']) {
  const pool = createPool({
    ...database_connection_options(database_url),
    connectionLimit: 5,
    connectTimeout: 5000,
    maxIdle: 5,
    idleTimeout: 30000,
    waitForConnections: true,
    queueLimit: 20,
  });

  return { db: drizzle(pool, { schema, mode: 'default' }), pool };
}

export type database = ReturnType<typeof create_database>['db'];
