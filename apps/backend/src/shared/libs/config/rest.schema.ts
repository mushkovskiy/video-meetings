import convict from 'convict';
import convictFormatWithValidator from 'convict-format-with-validator';

convict.addFormats(convictFormatWithValidator);

export type RestSchema = {
  PORT: number;
  SALT: string;
  JWT_SECRET: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  UPLOAD_DIRECTORY: string;
};

export const restSchema = convict<RestSchema>({
  PORT: {
    doc: 'Port for incoming connections',
    format: 'port',
    env: 'PORT',
    default: 4000,
  },
  SALT: {
    doc: 'Salt for password hash',
    format: String,
    env: 'SALT',
    default: null,
  },
  JWT_SECRET: {
    doc: 'Secret for sign JWT',
    format: String,
    env: 'JWT_SECRET',
    default: null,
  },
  DB_HOST: {
    doc: 'IP address of the database server',
    format: 'ipaddress',
    env: 'DB_HOST',
    default: '127.0.0.1',
  },
  DB_PORT: {
    doc: 'Port of the database server',
    format: 'port',
    env: 'DB_PORT',
    default: '27017',
  },
  DB_NAME: {
    doc: 'Database name',
    format: String,
    env: 'DB_NAME',
    default: 'video-meetings',
  },
  DB_USER: {
    doc: 'Database user',
    format: String,
    env: 'DB_USER',
    default: null,
  },
  DB_PASSWORD: {
    doc: 'Database password',
    format: String,
    env: 'DB_PASSWORD',
    default: null,
  },
  UPLOAD_DIRECTORY: {
    doc: 'Directory for uploaded files',
    format: String,
    env: 'UPLOAD_DIRECTORY',
    default: null,
  },
});
