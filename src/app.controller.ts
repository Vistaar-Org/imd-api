import {
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';
import { sanitizeLatLong } from './app.utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';

enum PROVIDER {
  UPCAR = 'upcar',
  OUAT = 'ouat',
}
@Controller()
// @UseInterceptors(new CentroidInterceptor())
export class AppController {
  private readonly logger: Logger;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appService: AppService,
    private readonly httpService: HttpService,
  ) {
    this.logger = new Logger(AppController.name);
  }

  private async getDistrict(lat: string, lon: string): Promise<any> {
    try {
      const resp = await this.httpService.axiosRef.get(
        `https://geoip.samagra.io/georev?lat=${lat}&lon=${lon}`,
      );
      console.log('district from geoip: ', resp.data.district);
      return resp.data.district;
    } catch (err) {
      this.logger.error('Error occurred while reading the geoip database', err);
      throw new InternalServerErrorException(
        'Error occurred while reading the geoip database',
      );
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('advisory')
  @ApiQuery({
    name: 'latitude',
    type: String,
  })
  @ApiQuery({
    name: 'longitude',
    type: String,
  })
  @ApiQuery({
    name: 'provider',
    enum: PROVIDER,
  })
  @ApiResponse({})
  async getWeather(
    @Query('latitude') latiude: string,
    @Query('longitude') longitude: string,
    @Query('provider') provider: string,
  ) {
    const district = await this.getDistrict(latiude, longitude);
    if (!provider) {
      provider = 'upcar';
    }

    if (district && provider) {
      const res = await this.cacheManager.get(
        `${district.toLowerCase()}-${provider.toLowerCase()}`,
      );
      if (res) {
        this.logger.log(
          'hitting cache to respond for district ' +
            district +
            ' provider ' +
            provider,
        );
        return res;
      }
    }
    //
    this.logger.log(
      `Received latitude: ${latiude} and longitude: ${longitude}`,
    );

    let sanitizedParams = {
      latitude: latiude,
      longitude,
    };
    try {
      sanitizedParams = sanitizeLatLong(latiude, longitude);
    } catch (err) {
      console.error('error setting sanitized lat long');
    }

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
    await this.cacheManager.set(
      `${district.toLowerCase()}-${provider.toLowerCase()}`,
      result,
      1000 * 60 * 60,
    );
    return result;
  }

  @Get('clear-cache')
  async clearCache() {
    await this.cacheManager.reset();
    return 'Cache Cleared';
  }
}
