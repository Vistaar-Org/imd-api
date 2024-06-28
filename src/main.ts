import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port: any = process.env.PORT || 3000;

  app.enableCors();
  await app.listen(3000, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

bootstrap();
