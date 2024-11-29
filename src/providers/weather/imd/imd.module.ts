import { Logger, Module } from '@nestjs/common';
import { IMDWeatherService } from './imd.service';

@Module({
  imports: [],
  providers: [IMDWeatherService, Logger],
  exports: [IMDWeatherService],
})
export class IMDWeatherModule {}
