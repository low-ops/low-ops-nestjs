export type S3RuntimeConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  prefix: string;
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
  performDelete: boolean;
};

const MENIX_S3_SERVICE = 'com.mendix.storage.s3';
const AWS_REGION_PATTERN = /^[a-z]{2}(?:-[a-z]+)+-\d+$/;

export function parseBooleanEnv(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

export function parseBucketConfig(raw: string): {
  bucket: string;
  prefix: string;
} {
  const normalized = raw.replace(/^\/+|\/+$/g, '');
  const slashIndex = normalized.indexOf('/');

  if (slashIndex === -1) {
    return { bucket: normalized, prefix: '' };
  }

  return {
    bucket: normalized.slice(0, slashIndex),
    prefix: normalized.slice(slashIndex + 1).replace(/^\/+|\/+$/g, ''),
  };
}

export function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function isLikelyAwsRegion(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return AWS_REGION_PATTERN.test(value.trim());
}

export function extractRegionFromEndpoint(endpoint: string): string | null {
  try {
    const host = new URL(normalizeEndpoint(endpoint)).hostname.toLowerCase();

    // bucket.s3.eu-west-1.amazonaws.com
    // s3.eu-west-1.amazonaws.com
    // s3.amazonaws.com (legacy us-east-1)
    const match =
      host.match(/\.s3[.-]([a-z0-9-]+)\.amazonaws\.com$/) ||
      host.match(/^s3[.-]([a-z0-9-]+)\.amazonaws\.com$/);

    if (match?.[1] && match[1] !== 'dualstack' && isLikelyAwsRegion(match[1])) {
      return match[1];
    }

    if (host === 's3.amazonaws.com' || host.endsWith('.s3.amazonaws.com')) {
      return 'us-east-1';
    }
  } catch {
    return null;
  }

  return null;
}

export function resolveS3Region(endpoint: string): string {
  const candidates = [
    process.env.S3_REGION,
    process.env.AWS_REGION,
    process.env.AWS_DEFAULT_REGION,
    process.env.S3_SERVICE_NAME,
  ];

  for (const candidate of candidates) {
    if (isLikelyAwsRegion(candidate)) {
      return candidate!.trim();
    }
  }

  return extractRegionFromEndpoint(endpoint) ?? 'us-east-1';
}

export function hasS3Config(): boolean {
  const serviceName = process.env.S3_SERVICE_NAME?.trim();

  // Mendix storage-service-name may be azure/localfilesystem — skip S3 then.
  if (
    serviceName &&
    serviceName.startsWith('com.mendix.storage.') &&
    serviceName !== MENIX_S3_SERVICE
  ) {
    return false;
  }

  return Boolean(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ENDPOINT,
  );
}

export function resolveS3Config(): S3RuntimeConfig | null {
  if (!hasS3Config()) {
    return null;
  }

  const endpoint = normalizeEndpoint(process.env.S3_ENDPOINT!);
  const { bucket, prefix } = parseBucketConfig(process.env.S3_BUCKET_NAME!);
  const region = resolveS3Region(endpoint);
  const forcePathStyle = true;

  return {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucket,
    prefix,
    endpoint,
    region,
    forcePathStyle,
    performDelete: parseBooleanEnv(process.env.S3_PERFORM_DELETE),
  };
}
