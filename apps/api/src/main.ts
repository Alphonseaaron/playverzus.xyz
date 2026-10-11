import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { namedLogger } from '@playverzus/core';

const log = namedLogger('NestMain');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse proxy (Cloudflare / Render) for accurate client IP in rate limiting & auditing
  app.set('trust proxy', 1);

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global Input Validation & Mass-Assignment / Prototype Pollution Protection
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const envOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [];

  const defaultOrigins = [
    'https://playverzus.xyz',
    'https://www.playverzus.xyz',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3005',
  ];

  app.enableCors({
    origin: [...new Set([...defaultOrigins, ...envOrigins])],
    credentials: true,
  });

  // All API routes prefixed with /api
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  log.info({ port }, 'VerzusXYZ Backend API server listening with security hardening');
}

void bootstrap();
