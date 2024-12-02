import { Body, Controller, Get, Injectable, Logger, Post, Query } from "@nestjs/common";
import { UPCARAdvisoryService } from "./upcar.service";

@Injectable()
@Controller('upcar')
export class UPCARAdvisoryController {
  constructor(private readonly UPCARAdvisoryService: UPCARAdvisoryService, private readonly logger: Logger) {
    this.logger = new Logger(UPCARAdvisoryController.name);
  }

  @Get('')
  async getAdvisory() {
    this.logger.log('Getting UPCAR Advisory');
    return this.UPCARAdvisoryService.getRawAdvisory();
  }

  @Post('')
  async updateAdvisory(@Body() data: any, @Query('lang') lang: string) {
    this.logger.log('Updating UPCAR Advisory');
    return this.UPCARAdvisoryService.updateAdvisory(data, lang);
  }
}
