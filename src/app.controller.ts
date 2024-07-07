import {
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { sanitizeLatLong } from './app.utils';
import { CentroidInterceptor } from './centroid.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
@Controller()
@UseInterceptors(new CentroidInterceptor())
export class AppController {
  private readonly logger: Logger;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appService: AppService,
  ) {
    this.logger = new Logger(AppController.name);
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
    @Body() body: any,
  ) {
    const { district } = body;
    const res = await this.cacheManager.get(district);

    if (res) {
      return res;
    }

    this.logger.log(
      `Received latitude: ${latiude} and longitude: ${longitude}`,
    );

    const sanitizedParams = sanitizeLatLong(latiude, longitude);
    latiude = sanitizedParams.latitude;
    longitude = sanitizedParams.longitude;

    this.logger.log(
      `Sanitized latitude: ${latiude} and longitude: ${longitude}`,
    );

    const result = await this.appService.getWeather(
      latiude,
      longitude,
      district,
      provider,
    );

    // set the cache to invalidate at 1hrs
    await this.cacheManager.set(district, result, 1000 * 60 * 60);
    return result;
  }
}
