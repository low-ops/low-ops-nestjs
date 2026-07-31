export { hasS3Config, parseBooleanEnv } from './s3-config';

const PLACEHOLDER_DATABASE_URL =
  'postgresql://local:local@127.0.0.1:5432/local?schema=public';

let databaseConfigured = false;

export function buildDatabaseUrl(): string | null {
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const host = process.env.POSTGRES_HOST;
  const port = process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DATABASE;

  if (!user || !password || !host || !database) {
    return null;
  }

  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);

  return `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}?schema=public`;
}

export function ensureDatabaseUrl(): boolean {
  const fromParts = buildDatabaseUrl();
  if (fromParts) {
    process.env.DATABASE_URL = fromParts;
    databaseConfigured = true;
    return true;
  }

  if (
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL !== PLACEHOLDER_DATABASE_URL
  ) {
    databaseConfigured = true;
    return true;
  }

  process.env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
  databaseConfigured = false;
  return false;
}

export function isDatabaseConfigured(): boolean {
  return databaseConfigured;
}
