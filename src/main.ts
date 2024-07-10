import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port: any = process.env.PORT || 3000;

  app.enableCors();
  const config = new DocumentBuilder()
    .setTitle('Weather Provider')
    .setDescription('The Weather API description')
    .setVersion('1.0')
    .addTag('weather')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

bootstrap();
