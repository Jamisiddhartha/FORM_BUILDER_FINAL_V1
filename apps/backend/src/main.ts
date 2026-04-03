import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { initSystem } from './sys.bootstrap';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  initSystem();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Increase payload limit for large base64 file uploads (e.g., checklist evidence)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const configuredOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const localDevOriginPattern =
    /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i;
  const lanDevOriginPattern =
    /^https?:\/\/(10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/i;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isConfiguredOrigin = configuredOrigins.includes(origin);
      const isLocalDevOrigin =
        process.env.NODE_ENV !== 'production' &&
        (localDevOriginPattern.test(origin) || lanDevOriginPattern.test(origin));

      if (isConfiguredOrigin || isLocalDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
  });
  app.use(cookieParser());

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // ✅ Safe route-table debug for Express
  try {
    const instance = app.getHttpAdapter().getInstance() as any; // Express app
    const stack = instance?._router?.stack;
    if (Array.isArray(stack)) {
      console.log('--- Route table (paths & methods) ---');
      stack.forEach((layer: any) => {
        if (layer?.route?.path && layer?.route?.methods) {
          const path = layer.route.path;
          const methods = Object.keys(layer.route.methods)
            .filter((m) => layer.route.methods[m])
            .map((m) => m.toUpperCase())
            .join(', ');
          console.log(`${methods} ${path}`);
        }
      });
      console.log('-------------------------------------');
    }
  } catch (e) {
    console.log('Route-table debug skipped:', e?.message || e);
  }

  await app.listen(process.env.PORT || 3001);
  console.log(`🚀 Backend running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
