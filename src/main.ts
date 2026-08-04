import { initTracing, shutdownTracing } from './tracing';

initTracing();

import { NestFactory } from '@nestjs/core';
import { RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as http from 'http';
import * as client from 'prom-client';
import { AppModule } from './app.module';
import { ensureDatabaseUrl } from './config/env';
import { JsonLogger } from './common/logger/json.logger';
import { NoCacheInterceptor } from './common/interceptors/no-cache.interceptor';
import {
  httpActiveRequests,
  httpErrorsTotal,
  httpRequestDuration,
  normalizePath,
} from './metrics/http-metrics';

function startMetricsServer(metricsPort: number, logger: JsonLogger): void {
  client.collectDefaultMetrics();

  const server = http.createServer((_req, res) => {
    client.register
      .metrics()
      .then((metrics) => {
        res.setHeader('Content-Type', client.register.contentType);
        res.end(metrics);
      })
      .catch(() => {
        res.statusCode = 500;
        res.end();
      });
  });

  server.listen(metricsPort, '0.0.0.0', () => {
    logger.log(
      `Prometheus metrics listening on port ${metricsPort}`,
      'Metrics',
    );
  });
}

async function bootstrap() {
  ensureDatabaseUrl();

  const logger = new JsonLogger();
  const app = await NestFactory.create(AppModule, { logger });

  app.enableShutdownHooks();

  const origin = process.env.APPLICATION_URL;
  if (origin) {
    app.enableCors({ origin });
  }

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'ready', method: RequestMethod.GET }],
  });

  app.useGlobalInterceptors(new NoCacheInterceptor());

  app.use((req, res, next) => {
    if (req.path === '/ready') {
      next();
      return;
    }
    const path = normalizePath(req.path);
    httpActiveRequests.inc();
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const duration =
        Number(process.hrtime.bigint() - started) / 1_000_000_000;
      const status = String(res.statusCode);
      httpActiveRequests.dec();
      httpRequestDuration.labels(req.method, path, status).observe(duration);
      if (status.startsWith('4') || status.startsWith('5')) {
        if (status !== '404') {
          httpErrorsTotal.labels(req.method, path, status).inc();
        }
      }
    });
    next();
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Default API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 8000);
  const metricsPort = Number(process.env.METRICS_PORT ?? 8001);

  startMetricsServer(metricsPort, logger);

  await app.listen(port, '0.0.0.0');
  logger.log(`Application listening on port ${port}`, 'Bootstrap');

  process.on('SIGTERM', () => {
    app
      .close()
      .then(() => shutdownTracing())
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

void bootstrap();
