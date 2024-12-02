import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { AppService } from './app.service';
import { sanitizeLatLong } from './app.utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { WEATHER_PROVIDERS } from './constants/enums';
import { generateContext } from './beckn.utils';
import { IMDWeatherService } from './providers/weather/imd/imd.service';
import { OUATWeatherService } from './providers/weather/ouat/ouat.service';
import { UPCARAdvisoryService } from './providers/advisory/upcar/upcar.service';
import { OUATAdvisoryService } from './providers/advisory/ouat/ouat.service';
import { DUMMY_WEATHER } from './constants/responses';

enum PROVIDER {
  UPCAR = 'upcar',
  OUAT = 'ouat',
}

@Controller()
export class AppController {
  private readonly logger: Logger;
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly appService: AppService,
    private readonly httpService: HttpService,
    private readonly IMDWeatherService: IMDWeatherService,
    private readonly OUATWeatherService: OUATWeatherService,
    private readonly UPCARAdvisoryService: UPCARAdvisoryService,
    private readonly OUATAdvisoryService: OUATAdvisoryService,
  ) {
    this.logger = new Logger(AppController.name);
  }

  private async getDistrict(lat: string, lon: string): Promise<any> {
    try {
      const resp = await this.httpService.axiosRef.get(
        `https://geoip.samagra.io/georev?lat=${lat}&lon=${lon}`,
      );
      this.logger.log(`district from geoip: ${resp.data.district}`);
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

  @Get('clear-cache')
  async clearCache() {
    await this.cacheManager.reset();
    return 'Cache Cleared';
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
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('provider') provider: string,
    @Query('weather') weather: string,
  ) {
    this.logger.log(
      `Received latitude: ${latitude} and longitude: ${longitude}`,
    );
    const district = await this.getDistrict(latitude, longitude);
    // setting default advisory provider to UPCAR
    if (!provider) provider = 'upcar';
    // setting default weather provider to IMD
    if (!weather) weather = 'imd';


    if (district && provider && weather) {
      const res = await this.cacheManager.get(
        `${district.toLowerCase()}-${provider.toLowerCase()}-${weather.toLowerCase()}`,
      );
      if (res) {
        this.logger.log(
          `hitting cache to respond for district ${district} provider ${provider} weather ${weather}`,
        );
        return res;
      }
    }

    let sanitizedParams = {
      latitude,
      longitude,
    };

    try {
      sanitizedParams = sanitizeLatLong(latitude, longitude);
    } catch (err) {
      console.error('error setting sanitized lat long');
    }

    latitude = sanitizedParams.latitude;
    longitude = sanitizedParams.longitude;

    this.logger.log(
      `Sanitized latitude: ${latitude} and longitude: ${longitude}`,
    );

    let weatherItems = undefined;
    let advisoryItems = undefined;

    // get weather items
    switch (weather) {
      case WEATHER_PROVIDERS.IMD:
        weatherItems = await this.IMDWeatherService.getWeather(latitude, longitude);
        break;
      case WEATHER_PROVIDERS.OUAT:
        weatherItems = await this.OUATWeatherService.getWeather(district);
        break;
      default:
        weatherItems = await this.IMDWeatherService.getWeather(latitude, longitude);
        break;
    }

    if (!weatherItems) weatherItems = DUMMY_WEATHER;

    switch (provider) {
      case PROVIDER.UPCAR:
        advisoryItems = await this.UPCARAdvisoryService.getAdvisory();
        break;
      case PROVIDER.OUAT:
        advisoryItems = await this.OUATAdvisoryService.getAdvisory(district);
        break;
      default:
        advisoryItems = await this.UPCARAdvisoryService.getAdvisory();
        break;
    }


    const result = {
      context: generateContext(),
      message: {
        catalog: {
          providers: [
            weatherItems,
            advisoryItems,
          ].filter((item) => item != undefined),
        },
      },
    }

    let district_hindi = district,
      district_oria = district;
    try {
      // fix the district name
      district_hindi = await this.appService.transliterate(
        district,
        'en',
        'hi',
      );

      district_oria = await this.appService.transliterate(district, 'en', 'or');
    } catch (err) {
      this.logger.error('Error occurred while getting weather data', err);
    }

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
      1000 * 60 * 60 * 4,
    );
    return result;
  }

  @Get('crops')
  getCrops() {
    return this.appService.getCrops();
  }

  @Post('crops')
  updateCrops(@Body() data: any) {
    return this.appService.updateCrops(data);
  }

  @Get('conditions')
  getConditions() {
    return this.appService.getConditions();
  }

  @Post('conditions')
  updateConditions(@Body() data: any) {
    return this.appService.updateConditions(data);
  }
}
