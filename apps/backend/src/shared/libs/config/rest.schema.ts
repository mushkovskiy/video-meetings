import convict from 'convict';
import convictFormatWithValidator from 'convict-format-with-validator';

convict.addFormats(convictFormatWithValidator);

export type RestSchema = {
  PORT: number;
  SALT: string;
  JWT_SECRET: string;
  DB_MONGO_HOST: string;
  DB_MONGO_PORT: string;
  DB_MONGO_NAME: string;
  DB_MONGO_USER: string;
  DB_MONGO_PASSWORD: string;
  UPLOAD_DIRECTORY: string;
  UPLOAD_MAX_RECORDING_SIZE: number;
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
  DB_MONGO_HOST: {
    doc: 'IP address of the MongoDB server',
    format: 'ipaddress',
    env: 'DB_MONGO_HOST',
    default: '127.0.0.1',
  },
  DB_MONGO_PORT: {
    doc: 'Port of the MongoDB server',
    format: 'port',
    env: 'DB_MONGO_PORT',
    default: '27017',
  },
  DB_MONGO_NAME: {
    doc: 'MongoDB database name',
    format: String,
    env: 'DB_MONGO_NAME',
    default: 'video-meetings',
  },
  DB_MONGO_USER: {
    doc: 'MongoDB user',
    format: String,
    env: 'DB_MONGO_USER',
    default: '',
  },
  DB_MONGO_PASSWORD: {
    doc: 'MongoDB password',
    format: String,
    env: 'DB_MONGO_PASSWORD',
    default: '',
  },
  UPLOAD_DIRECTORY: {
    doc: 'Directory for uploaded files',
    format: String,
    env: 'UPLOAD_DIRECTORY',
    default: null,
  },
  UPLOAD_MAX_RECORDING_SIZE: {
    doc: 'Maximum size of an uploaded meeting recording, in bytes',
    format: 'nat',
    env: 'UPLOAD_MAX_RECORDING_SIZE',
    default: 104857600,
  },
});
