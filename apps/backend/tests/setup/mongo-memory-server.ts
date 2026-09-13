import { MongoMemoryServer } from 'mongodb-memory-server';

let instance: MongoMemoryServer | undefined;

export const startTestDatabase = async (dbName: string): Promise<string> => {
  instance = await MongoMemoryServer.create({ instance: { dbName } });

  const uri = instance.getUri();
  const url = new URL(uri.replace('mongodb://', 'http://'));

  process.env.DB_MONGO_HOST = url.hostname;
  process.env.DB_MONGO_PORT = url.port;
  process.env.DB_MONGO_NAME = dbName;
  process.env.DB_MONGO_USER = '';
  process.env.DB_MONGO_PASSWORD = '';

  return uri;
};

export const stopTestDatabase = async (): Promise<void> => {
  await instance?.stop();
  instance = undefined;
};
