export const getMongoURI = (
  host: string,
  port: string,
  databaseName: string,
  username: string,
  password: string,
): string => {
  const credentials = username && password ? `${username}:${password}@` : '';

  return `mongodb://${credentials}${host}:${port}/${databaseName}`;
};
