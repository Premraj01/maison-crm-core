import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import type { AppConfig } from './config/configuration';
import { RedisIoAdapter } from './realtime/adapters/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<AppConfig, true>);
  const logger = new Logger('Bootstrap');

  const port = config.get('port', { infer: true });
  const apiPrefix = config.get('apiPrefix', { infer: true });
  const corsOrigins = config.get('corsOrigins', { infer: true });
  const isProduction = config.get('env', { infer: true }) === 'production';

  app.setGlobalPrefix(apiPrefix);
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableShutdownHooks();

  // Multi-instance fan-out when REDIS_URL is set; default adapter otherwise.
  const redisAdapter = new RedisIoAdapter(app);
  if (await redisAdapter.connect()) {
    app.useWebSocketAdapter(redisAdapter);
  }

  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Maison CRM API')
      .setDescription('REST + WebSocket API for the Maison CRM')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(`${apiPrefix}/docs`, app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  await app.listen(port);

  logger.log(`HTTP    http://localhost:${port}/${apiPrefix}`);
  logger.log(`WS      ws://localhost:${port}${config.get('realtime.namespace', { infer: true })}`);
  if (!isProduction) logger.log(`Docs    http://localhost:${port}/${apiPrefix}/docs`);
}

void bootstrap();
