import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  getStationId,
  mapIMDItems,
  mapAdvisoryData,
  mapOUATWeather,
} from './app.utils';
import { firstValueFrom } from 'rxjs';
import { generateContext } from './beckn.utils';

@Injectable()
export class AppService {
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.logger = new Logger();
  }

  getHello(): string {
    return 'Hello World!';
  }

  private async getDataFromOUAT(lat: string, long: string) {
    const geoIPBaseURL = this.configService.get<string>('GEOIP_BASE_URL');
    const locData = await this.httpService.axiosRef.get(
      geoIPBaseURL + `/georev?lat=${lat}&lon=${long}`,
    );

    if (locData.data.state !== 'ODISHA') {
      throw new InternalServerErrorException(
        'We only OUAT data only for the state of ODISHA right now.',
      );
    }
    // figure out district
    const district = locData.data.district.toLowerCase();

    // fetching data from OUAT
    const ouatBaseURL = this.configService.get<string>('OUAT_BASE_URL');
    const enableOld = this.configService.get<string>('OUAT_ENABLE_OLD');
    console.log('enable old: ', enableOld);
    console.log('typeof enableOld', typeof enableOld);
    if (enableOld.trim() == 'true') {
      const ouatData = await this.httpService.axiosRef.get(
        ouatBaseURL + `/history/31-05-2024_${district}.json`,
      );

      return ouatData.data;
    } else {
      const ouatData = await this.httpService.axiosRef.get(
        ouatBaseURL + `/latest/${district}.json`,
      );
      ouatData.data['district'] = district;
      return ouatData.data;
    }
  }

  private async getWeatherFromIMD(lat: string, long: string) {
    try {
      const dist = this.configService.get<number>('IMD_MIN_STATION_DISTANCE');
      const stationId = getStationId(lat, long, dist);
      if (!stationId) {
        throw new InternalServerErrorException(
          'No IMD weather station found for the sent coordinates.',
        );
      }
      const baseURL = this.configService.get<string>('IMD_BASE_URL');
      const urls = [
        `/api/cityweather_loc.php?id=${stationId}`,
        `/api/current_wx_api.php?id=${stationId}`,
      ];

      const apiCalls = urls.map((url: string) => {
        return firstValueFrom(this.httpService.get(baseURL + url));
      });

      const [forecastData, currentData] = await Promise.all(apiCalls);
      return {
        sevenDay: forecastData.data,
        current: currentData.data,
      };
    } catch (err) {
      this.logger.error('Error resolving API Calls', err);
    }
  }

  async getAdvisoryFromUpcar() {
    const upcarBaseURL = this.configService.get<string>('UPCAR_BASE_URL');

    try {
      const upcarData = await this.httpService.axiosRef.get(
        upcarBaseURL + '/latest.json',
      );

      return upcarData.data;
    } catch (err) {
      this.logger.error('Error while fetching advisory data from UPCAR', err);
    }
  }

  async getWeather(lat: string, long: string) {
    let imdItems = undefined,
      upcarItems = undefined,
      ouatWeatherItems = undefined,
      ouatAdvisoryItems = undefined;
    try {
      const imdData = await this.getWeatherFromIMD(lat, long);
      // console.log('imdData: ', imdData);
      imdItems = mapIMDItems(imdData);
    } catch (err) {
      this.logger.error('Error fetching weather data from IMD', err);
    }
    try {
      const upcarData = await this.getAdvisoryFromUpcar();
      upcarItems = mapAdvisoryData(upcarData, 'upcar');
    } catch (err) {
      this.logger.error('Error fetching advisory data from UPCAR', err);
    }
    let ouatData = undefined;
    try {
      ouatData = await this.getDataFromOUAT(lat, long);
      if (ouatData['ERROR']) {
        throw new InternalServerErrorException(
          `OUAT API is failing with the following error: ${ouatData['ERROR']}`,
        );
      }

      ouatWeatherItems = mapOUATWeather(ouatData);
      ouatAdvisoryItems = mapAdvisoryData(ouatData, 'ouat');
    } catch (err) {
      ouatData = undefined;
      this.logger.error('error getting data from OUAT', err);
      this.logger.warn('skipped adding data from OUAT');
    }
    // const mapped = transformIMDDataToBeckn(imdData.sevenDay);
    return {
      context: generateContext(),
      message: {
        catalog: {
          providers: [
            imdItems ? imdItems : undefined,
            ouatWeatherItems ? ouatWeatherItems : undefined,
            upcarItems ? upcarItems : undefined,
            ouatAdvisoryItems ? ouatAdvisoryItems : undefined,
          ].filter((item) => item != undefined),
        },
      },
    };
  }
}
