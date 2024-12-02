import { Body, Controller, Get, Injectable, Logger, Post, Query } from "@nestjs/common";
import { OUATAdvisoryService } from "./ouat.service";
@Injectable()
@Controller('ouat')
export class OUATAdvisoryController {
  constructor(private readonly ouatAdvisoryService: OUATAdvisoryService, private readonly logger: Logger) {}

  @Get('')
  async getAdvisory(@Query('district') district: string) {
    this.logger.log('Getting OUAT Advisory');
    return this.ouatAdvisoryService.getAdvisory(district);
  }

  @Post('')
  async updateAdvisory(@Body() data: any, @Query('district') district: string, @Query('lang') lang: string) {
    this.logger.log('Updating OUAT Advisory');
    return this.ouatAdvisoryService.updateAdvisory(data, district, lang);
  }
}
