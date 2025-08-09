import type { config as MssqlConfig } from 'mssql';
export function parseConnectionString(connectionString: string) {
  const url = new URL(connectionString);

  return {
    hostname: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    username: url.username,
    password: url.password,
    database: url.pathname && url.pathname !== '/' ? url.pathname.slice(1) : '',
  };
}

export function parseMssqlUrlConnectionString(connStr: string): MssqlConfig {
  const url = new URL(connStr);

  const encryptParam = url.searchParams.get('encrypt');
  const trustServerCertParam = url.searchParams.get('trustServerCertificate');
  const connectionTimeoutParam = url.searchParams.get('connectionTimeout');
  const encrypt =
    encryptParam !== null ? encryptParam.toLowerCase() === 'true' : true;
  const trustServerCertificate =
    trustServerCertParam !== null
      ? trustServerCertParam.toLowerCase() === 'true'
      : false;

  const connectTimeout = connectionTimeoutParam
    ? parseInt(connectionTimeoutParam, 10)
    : undefined;
  const config: MssqlConfig = {
    server: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.replace(/^\//, ''), // remove leading /
    port: url.port ? parseInt(url.port, 10) : 1433,
    options: {
      encrypt,
      trustServerCertificate,
      connectTimeout,
    },
  };

  if (!config.server) throw new Error('Missing "server" in connection string');
  if (!config.user) throw new Error('Missing "user" in connection string');
  if (!config.password)
    throw new Error('Missing "password" in connection string');

  return config;
}
