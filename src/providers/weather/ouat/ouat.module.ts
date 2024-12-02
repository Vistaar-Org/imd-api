import { Logger, Module } from '@nestjs/common';
import { OUATWeatherService } from './ouat.service';

@Module({
  imports: [],
  providers: [OUATWeatherService, Logger],
  exports: [OUATWeatherService],
})
export class OUATWeatherModule {}
