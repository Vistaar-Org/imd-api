import { Logger, Module } from '@nestjs/common';
import { OUATAdvisoryService } from './ouat.service';
import { OUATAdvisoryController } from './ouat.controller';
import { MinioModule } from 'src/minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [OUATAdvisoryController],
  providers: [OUATAdvisoryService, Logger],
  exports: [OUATAdvisoryService],
})
export class OUATAdvisoryModule {}
