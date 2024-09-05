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
import { WEATHER_PROVIDERS } from './constants/enums';

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
  @ApiQuery({
    name: 'weather',
    enum: WEATHER_PROVIDERS,
  })
  @ApiResponse({})
  async getWeather(
    @Query('latitude') latiude: string,
    @Query('longitude') longitude: string,
    @Query('provider') provider: string,
    @Query('weather') weather: string,
  ) {
    const district = await this.getDistrict(latiude, longitude);
    if (!provider) {
      provider = 'upcar';
    }

    if (!weather) {
      weather = 'imd';
    }

    if (district && provider && weather) {
      const res = await this.cacheManager.get(
        `${district.toLowerCase()}-${provider.toLowerCase()}-${weather.toLowerCase()}`,
      );
      if (res) {
        this.logger.log(
          'hitting cache to respond for district ' +
            district +
            ' provider ' +
            provider +
            ' weather ' +
            weather,
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
      weather,
    );

    // fix the district name
    const district_hindi = await this.appService.transliterate(
      district,
      'en',
      'hi',
    );

    const district_oria = await this.appService.transliterate(
      district,
      'en',
      'or',
    );

    const augmentedProviders = result.message.catalog.providers.map(
      (provider) => {
        if (provider.category_id === 'weather_provider') {
          const newItems = provider.items.map((item) => {
            if (item.locations_ids) {
              const locations_ids = [district, district_hindi, district_oria];
              const newItem = item;
              item['locations_ids'] = locations_ids;
              return newItem;
            }

            if (item.location_ids) {
              const location_ids = [district, district_hindi, district_oria];
              const newItem = item;
              item['location_ids'] = location_ids;
              return newItem;
            }

            return item;
          });

          const newProvider = provider;
          newProvider['items'] = newItems;
          return newProvider;
        }
        return provider;
      },
    );

    result.message.catalog.providers = augmentedProviders;

    // set the cache to invalidate at 1hrs
    await this.cacheManager.set(
      `${district.toLowerCase()}-${provider.toLowerCase()}-${weather.toLowerCase()}`,
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
