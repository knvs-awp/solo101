import assert from 'node:assert/strict';
import { test } from 'node:test';
import { production_database_url } from '../src/production-config.js';

const config = {
  AWS_REGION: 'us-east-2',
  DATABASE_PASSWORD_PARAMETER: '/solo101/prod/db-password',
  DATABASE_HOST: 'database.example.com',
  DATABASE_NAME: 'solo101',
  DATABASE_USER: 'solo101_app',
  DATABASE_SSL_CA_FILE: '/etc/solo101/global-bundle.pem',
};

test('retrieves the configured parameter and preserves password punctuation', async () => {
  const password = 'example:@/#?% +\\\"\n';
  const uri = await production_database_url(config, async (region, name) => {
    assert.equal(region, config.AWS_REGION);
    assert.equal(name, config.DATABASE_PASSWORD_PARAMETER);
    return password;
  });
  const parsed = new URL(uri);
  assert.equal(decodeURIComponent(parsed.password), password);
  assert.equal(parsed.hostname, config.DATABASE_HOST);
  assert.equal(parsed.pathname, '/solo101');
  assert.equal(parsed.username, 'solo101_app');
  assert.equal(parsed.port, '3306');
});

test('missing configuration fails before requesting a secret', async () => {
  for (const name of Object.keys(config)) {
    const incomplete: NodeJS.ProcessEnv = { ...config };
    delete incomplete[name];
    await assert.rejects(production_database_url(incomplete, async () => {
      assert.fail('must validate configuration before retrieving credentials');
    }), new RegExp(`${name} is required`));
  }
});

test('rejects host and database values that could alter the connection URL', async () => {
  const never_fetch = async () => {
    assert.fail('must reject invalid settings before retrieving credentials');
  };
  await assert.rejects(production_database_url({ ...config, DATABASE_HOST: 'host/other?ssl=false' }, never_fetch), /DATABASE_HOST/);
  await assert.rejects(production_database_url({ ...config, DATABASE_NAME: 'solo101?ssl=false' }, never_fetch), /DATABASE_NAME/);
});

test('rejects an empty password', async () => {
  await assert.rejects(production_database_url(config, async () => ''), /password must not be empty/);
});
