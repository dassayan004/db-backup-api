import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.getOrThrow<number>('PORT');
  const baseUrl = configService.getOrThrow<string>('BASE_URL');

  // swagger openapi
  const swaggerPrefix = 'swagger';
  const config = new DocumentBuilder()
    .setTitle('Backup Api')
    .setDescription('The Backup API description')
    .addServer(baseUrl)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(swaggerPrefix, app, document);

  // Middleware
  app.enableCors({ origin: ['*'], credentials: true });
  app.enableShutdownHooks();

  // Pipes
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(port);
  Logger.log(`🚀 Application is running on: ${baseUrl}`);
  Logger.log(`🌎 Swagger is running on: ${baseUrl}/${swaggerPrefix}`);
}
bootstrap();
