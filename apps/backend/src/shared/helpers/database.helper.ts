export const getMongoURI = (
  host: string,
  port: string,
  databaseName: string,
  username: string,
  password: string,
): string => {
  const hasCredentials = Boolean(username && password);
  const credentials = hasCredentials ? `${username}:${password}@` : '';
  // MONGO_INITDB_ROOT_USERNAME (see docker-compose.yml) creates the root
  // user in the `admin` database, not in `databaseName` — without this the
  // driver defaults authSource to `databaseName` and authentication fails.
  const authSource = hasCredentials ? '?authSource=admin' : '';

  return `mongodb://${credentials}${host}:${port}/${databaseName}${authSource}`;
};
