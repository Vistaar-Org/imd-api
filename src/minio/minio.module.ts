import { Module } from "@nestjs/common";
import { MinIOService } from "./minio.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Client as MinioClient } from "minio";

@Module({
  imports: [ConfigModule],
  providers: [
    MinIOService,
    {
      provide: MinioClient,
      useFactory: (configService: ConfigService) => {
        return new MinioClient({
          endPoint: configService.get<string>('MINIO_ENDPOINT'),
          port: parseInt(configService.get<string>('MINIO_PORT'), 10),
          useSSL: configService.get<string>('MINIO_USE_SSL') === 'true',
          accessKey: configService.get<string>('MINIO_ACCESS_KEY'),
          secretKey: configService.get<string>('MINIO_SECRET_KEY'),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [MinIOService],
})
export class MinioModule {}
