import { Logger, Module } from "@nestjs/common";
import { OUATAdvisoryModule } from "./ouat/ouat.module";
import { UPCARAdvisoryModule } from "./upcar/upcar.module";
import { OUATAdvisoryService } from "./ouat/ouat.service";
import { UPCARAdvisoryService } from "./upcar/upcar.service";
import { MinioModule } from "src/minio/minio.module";

@Module({
  imports: [OUATAdvisoryModule, UPCARAdvisoryModule, MinioModule],
  providers: [OUATAdvisoryService, UPCARAdvisoryService, Logger],
  exports: [OUATAdvisoryService, UPCARAdvisoryService],
})
export class AdvisoryModule {}
