import { Controller, Get, Logger, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { sanitizeLatLong } from './app.utils';

@Controller()
export class AppController {
  private readonly logger: Logger;
  constructor(private readonly appService: AppService) {
    this.logger = new Logger();
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('advisory')
  async getWeather(
    @Query('latitude') latiude: string,
    @Query('longitude') longitude: string,
    @Query('provider') provider: string,
  ) {
    this.logger.log(
      `Received latitude: ${latiude} and longitude: ${longitude}`,
    );

    const sanitizedParams = sanitizeLatLong(latiude, longitude);
    latiude = sanitizedParams.latitude;
    longitude = sanitizedParams.longitude;

    this.logger.log(
      `Sanitized latitude: ${latiude} and longitude: ${longitude}`,
    );

    return await this.appService.getWeather(latiude, longitude, provider);
  }
}
