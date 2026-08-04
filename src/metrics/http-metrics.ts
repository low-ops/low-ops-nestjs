import * as client from 'prom-client';

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
});

export const httpActiveRequests = new client.Gauge({
  name: 'http_active_requests',
  help: 'Number of in-flight HTTP requests',
});

export const httpErrorsTotal = new client.Counter({
  name: 'http_errors_total',
  help: 'Total HTTP error responses',
  labelNames: ['method', 'path', 'status'],
});

export const usersCreatedTotal = new client.Counter({
  name: 'users_created_total',
  help: 'Total users created',
});

export function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return (
    '/' +
    parts
      .map((part) => (/^\d+$/.test(part) ? ':id' : part))
      .join('/')
  );
}
