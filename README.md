# Low-Ops NestJS Default Template

<p align="left">
  <img src="./images/logo.svg" height="50" width="60" alt="Low-Ops logo" style="background: white; padding: 20px; border-radius: 10px; margin-right: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1)"/>
  <img src="./images/nestjs-logo.svg" height="50" width="60" alt="NestJS logo" style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1)"/>
</p>

NestJS template aligned with the Low-Ops platform specification.

## Getting Started

```bash
git clone {repository-url}
cd {repository-name}
cp .env.example .env
npm install
npm run start:dev
```

App runs on [http://localhost:8000](http://localhost:8000). OpenAPI docs at [http://localhost:8000/api/docs](http://localhost:8000/api/docs). Prometheus metrics at [http://localhost:8001](http://localhost:8001).

## Local development with Docker

```bash
docker compose up --build
```

## Key endpoints

| Endpoint | Description |
| --- | --- |
| `GET /ready` | Health check (outside `/api` prefix) |
| `GET /api/docs` | OpenAPI / Swagger UI |
| `GET :8001/metrics` | Prometheus metrics |
