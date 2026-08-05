# Low-Ops NestJS Default Template

<p align="left">
  <img src="./images/logo.svg" height="50" width="60" alt="Low-Ops logo" style="background: white; padding: 20px; border-radius: 10px; margin-right: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1)"/>
  <img src="./images/nestjs-logo.svg" height="50" width="60" alt="NestJS logo" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1)"/>
</p>

People desk-style NestJS starter with PostgreSQL and S3-compatible storage.

## Local development

```bash
npm install
npm run start:dev
```

## Docker

```bash
docker compose up --build
```

- App: `PORT` (default `8000`), health `GET /ready`
- Metrics: `METRICS_PORT` (default `8001`) Prometheus `/metrics`
- HTML and API responses use no-cache headers
- Compose includes PostgreSQL and MinIO
