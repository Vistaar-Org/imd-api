import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  Logger,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { sanitizeLatLong } from './app.utils';
import { CentroidInterceptor } from './centroid.interceptor';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ApiQuery, ApiResponse } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { createAuthorizationHeader } from './auth-builder';
import { lastValueFrom } from 'rxjs';

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
  ) {
    this.logger = new Logger(AppController.name);
  }

  private async getDistrict(lat: string, lon: string): Promise<any> {
    try {
      const resp = await this.httpService.axiosRef.get(
        `https://geoip.samagra.io/georev?lat=${lat}&lon=${lon}`,
      );
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
    @Body() body: any,
  ) {
    const district = await this.getDistrict(latiude, longitude);

    if (!provider) {
      provider = 'upcar';
    }

    const res = await this.cacheManager.get(
      `${district.toLowerCase()}-${provider.toLowerCase()}`,
    );

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

  @Post('/search')
  async getSearch(@Res() res: Response, @Body() body: any) {
    console.log('request on post route.');
    res.status(200).json({
      message: {
        ack: {
          status: 'ACK',
        },
      },
    });

    const { gps, district } = body.message.intent.location;
    const [lat, long] = gps.split(', ');
    const resp = await this.appService.getWeather(lat, long, district);
    resp.context = body.context;
    resp.context.action = 'on_search';
    // resp.context.message_id = uuidv4();

    // FORWARD THE REQUEST
    const authHeader = await createAuthorizationHeader(resp).then((res) => {
      console.log(res);
      return res;
    });
    const requestOptions = {
      headers: {
        'Content-Type': 'application/json',
        authorization: authHeader,
      },
      withCredentials: true,
      mode: 'cors',
    };
    console.log('calling request forwarder');
    await lastValueFrom(
      this.httpService.post(
        resp.context.bap_uri + '/on_search',
        resp,
        requestOptions,
      ),
    );
    console.log('auth header: ', authHeader);
  }
}
