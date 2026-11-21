import * as fs from 'node:fs';
import * as path from 'node:path';

// Load single canonical root .env first (fallback to local .env)
for (const envCandidate of [
  path.resolve(__dirname, '../../../.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
]) {
  try {
    if (fs.existsSync(envCandidate)) {
      const lines = fs.readFileSync(envCandidate, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // ignore missing .env in container builds
  }
}

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
  log.info({ port }, 'Playverzus.xyz Backend API server listening with security hardening');
}

void bootstrap();
