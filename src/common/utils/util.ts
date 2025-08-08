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
