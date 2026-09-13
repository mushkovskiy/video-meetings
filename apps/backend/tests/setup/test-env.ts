const defaults: Record<string, string> = {
  SALT: 'test-salt',
  JWT_SECRET: 'test-jwt-secret',
  DB_USER: 'test',
  DB_PASSWORD: 'test',
  UPLOAD_DIRECTORY: './uploads',
};

export const applyTestEnv = (): void => {
  for (const [key, value] of Object.entries(defaults)) {
    process.env[key] ??= value;
  }
};

applyTestEnv();
