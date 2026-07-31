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

export function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function hasS3Config(): boolean {
  return Boolean(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ENDPOINT,
  );
}
