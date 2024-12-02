import { HttpModule } from "@nestjs/axios";
import { Logger, Module } from "@nestjs/common";
import { CronService } from "./cron.service";

@Module({
  imports: [HttpModule],
  providers: [CronService, Logger],
})
export class CronModule {}
