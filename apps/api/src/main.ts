import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { namedLogger } from '@playverzus/core';

const log = namedLogger('NestMain');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // All API routes prefixed with /api
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  log.info({ port }, 'VerzusXYZ Backend API server listening');
}

void bootstrap();
