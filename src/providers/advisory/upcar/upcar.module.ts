import { Logger, Module } from '@nestjs/common';
import { UPCARAdvisoryService } from './upcar.service';
import { UPCARAdvisoryController } from './upcar.controller';
import { MinioModule } from 'src/minio/minio.module';

@Module({
  imports: [MinioModule],
  controllers: [UPCARAdvisoryController],
  providers: [UPCARAdvisoryService, Logger],
  exports: [UPCARAdvisoryService],
})
export class UPCARAdvisoryModule {}
