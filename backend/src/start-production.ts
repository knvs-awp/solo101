import { create_database } from './db/client.js';
import { production_database_url } from './production-config.js';

let stage = 'loading production configuration and the database password';
try {
  // production mode tells the database client to require the RDS CA bundle
  process.env['NODE_ENV'] = 'production';
  // the password stays in this process and is never written to a configuration file
  process.env['DATABASE_URL'] = await production_database_url();

  stage = 'verifying the database connection';
  // use a temporary pool to verify the app's credentials and TLS before serving requests
  const { pool } = create_database();
  try {
    await pool.query('SELECT 1');
  } finally {
    await pool.end();
  }
  console.info('production database connection verified');

  stage = 'starting the HTTP server';
  // server.js starts listening on import, so load it after the database check
  await import('./server.js');
} catch {
  // database and AWS error objects can contain credentials or response contents
  console.error(`production startup failed while ${stage}`);
  process.exitCode = 1;
}
