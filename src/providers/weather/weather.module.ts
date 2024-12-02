import { Logger, Module } from "@nestjs/common";
import { IMDWeatherModule } from "./imd/imd.module";
import { OUATWeatherModule } from "./ouat/ouat.module";
import { IMDWeatherService } from "./imd/imd.service";
import { OUATWeatherService } from "./ouat/ouat.service";

@Module({
  imports: [IMDWeatherModule, OUATWeatherModule],
  providers: [IMDWeatherService, OUATWeatherService, Logger],
  exports: [IMDWeatherService, OUATWeatherService],
})
export class WeatherModule {}
