import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import { createConnection } from 'mysql2/promise';
import { database_connection_options } from './client.js';

// migrations share one connection, and mysql records which ones have been applied
const connection = await createConnection(database_connection_options());

try {
  await migrate(drizzle(connection), {
    migrationsFolder: fileURLToPath(new URL('../../drizzle', import.meta.url)),
  });
  console.info('database migrations applied');
} finally {
  await connection.end();
}
