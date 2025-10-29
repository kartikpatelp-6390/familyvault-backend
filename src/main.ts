import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { TenantAwareInterceptor } from './common/interceptors/tenant-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new TenantAwareInterceptor());

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',   // your Vite frontend
      'http://127.0.0.1:5173',   // sometimes Vite runs on this
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, // allow cookies / auth headers
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') || 3000;
  await app.listen(port);
  console.log(`App running on http://localhost:${port}`);
}
bootstrap();
