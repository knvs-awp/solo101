import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec_file = promisify(execFile);

// on EC2 the AWS CLI uses the instance role to read the encrypted password
async function read_parameter(region: string, name: string): Promise<string> {
  try {
    const { stdout } = await exec_file('aws', [
      'ssm', 'get-parameter', '--region', region, '--name', name,
      '--with-decryption', '--output', 'json', '--no-cli-pager',
    ], {
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 65536,
      windowsHide: true,
    });
    const response: unknown = JSON.parse(stdout);
    if (typeof response !== 'object' || response === null || !('Parameter' in response)) {
      throw new Error();
    }
    const parameter = response.Parameter;
    if (typeof parameter !== 'object' || parameter === null || !('Value' in parameter)
      || !('Type' in parameter) || parameter.Type !== 'SecureString'
      || typeof parameter.Value !== 'string' || !parameter.Value) {
      throw new Error();
    }
    return parameter.Value;
  } catch {
    // CLI errors and malformed responses can include the secret value
    throw new Error('Could not retrieve the database password from Parameter Store');
  }
}

// tests can supply a parameter reader here without contacting AWS
export async function production_database_url(
  env: NodeJS.ProcessEnv = process.env,
  get_parameter = read_parameter,
): Promise<string> {
  function required(name: string): string {
    const value = env[name];
    if (!value) throw new Error(`${name} is required for production startup`);
    return value;
  }

  const region = required('AWS_REGION');
  const parameter = required('DATABASE_PASSWORD_PARAMETER');
  const host = required('DATABASE_HOST');
  const user = required('DATABASE_USER');
  const database = required('DATABASE_NAME');
  // the database client needs this path to verify the RDS certificate
  required('DATABASE_SSL_CA_FILE');
  // validate these settings before placing them directly into the connection URL
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    throw new Error('DATABASE_HOST must be a DNS hostname');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('DATABASE_NAME must contain letters, numbers, or underscores');
  }

  const password = await get_parameter(region, parameter);
  if (!password) throw new Error('The database password must not be empty');
  // encode credentials so generated passwords with URL punctuation work correctly
  return `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:3306/${database}`;
}
