import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CROP_MAPPINGS, getStationId, sanitizeIMDWeather } from './app.utils';
import { mapIMDItems, mapAdvisoryData, mapOUATWeather } from './beckn.utils';
import { firstValueFrom } from 'rxjs';
import { generateContext } from './beckn.utils';
import { PROVIDERS } from './constants/enums';

@Injectable()
export class AppService {
  private readonly logger: Logger;
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.logger = new Logger(AppService.name);
  }

  getHello(): string {
    return 'Hello World!';
  }

  private async getDataFromOUAT(lat: string, long: string) {
    const geoIPBaseURL = this.configService.get<string>('GEOIP_BASE_URL');
    const locData = await this.httpService.axiosRef.get(
      geoIPBaseURL + `/georev?lat=${lat}&lon=${long}`,
    );

    // if (locData.data.state !== 'ODISHA') {
    //   throw new InternalServerErrorException(
    //     'We only OUAT data only for the state of ODISHA right now.',
    //   );
    // }
    // figure out district
    const district =
      locData.data.state !== 'ODISHA'
        ? 'khordha'
        : locData.data.district.toLowerCase();

    // fetching data from OUAT
    const ouatBaseURL = this.configService.get<string>('OUAT_BASE_URL');
    const enableOld = this.configService.get<string>('OUAT_ENABLE_OLD');

    if (enableOld.trim() == 'true') {
      const ouatData = await this.httpService.axiosRef.get(
        ouatBaseURL + `/history/31-05-2024_${district}.json`,
      );

      ouatData.data['district'] = district;
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
        `${baseURL}/api/cityweather_loc.php?id=${stationId}`,
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat}%2C${long}?unitGroup=metric&key=UFQNJT8FL927DT7HNQME9HWSL&contentType=json`,
      ];

      const apiCalls = urls.map((url: string) => {
        return firstValueFrom(this.httpService.get(url));
      });

      const [forecastData, visualCrossing] = await Promise.all(apiCalls);
      return {
        imd: forecastData.data[0],
        visualCrossing: visualCrossing.data.currentConditions,
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

  async getHindiAdvisoryFromUpcar() {
    const upcarBaseURL = this.configService.get<string>('UPCAR_BASE_URL');

    try {
      const upcarData = await this.httpService.axiosRef.get(
        upcarBaseURL + '/latest_hindi.json',
      );

      return upcarData.data;
    } catch (err) {
      this.logger.error('Error while fetching advisory data from UPCAR', err);
    }
  }

  async getWeather(lat: string, long: string, provider: string) {
    if (!provider) provider = PROVIDERS.UPCAR;
    let imdItems = undefined,
      upcarItems = undefined,
      ouatWeatherItems = undefined,
      ouatAdvisoryItems = undefined;
    // IMD Data
    try {
      const imdData = await this.getWeatherFromIMD(lat, long);
      const sanitizedIMDData = sanitizeIMDWeather(imdData);
      // console.log('imdData: ', imdData);
      imdItems = mapIMDItems(sanitizedIMDData);
    } catch (err) {
      this.logger.error('Error fetching weather data from IMD', err);
    }

    // upcar data
    if (provider === PROVIDERS.UPCAR) {
      try {
        const upcarData = await this.getAdvisoryFromUpcar();
        upcarItems = mapAdvisoryData(upcarData, 'upcar');
        const upcarHindiData = await this.getHindiAdvisoryFromUpcar();
        const upcarHindiProvider = mapAdvisoryData(upcarHindiData, 'upcar');
        const hindiItems = upcarHindiProvider.items.map((item) => {
          if (CROP_MAPPINGS[item.code]) {
            item.descriptor.name = CROP_MAPPINGS[item.code].hi;
          }
          item.category_ids.push('hi_translated');
          return item;
        });
        upcarItems.items.push(...hindiItems);
        upcarItems.categories.push({
          id: 'hi_translated',
        });
      } catch (err) {
        this.logger.error('Error fetching advisory data from UPCAR', err);
      }
    }

    let ouatData = undefined;
    if (provider === PROVIDERS.OUAT) {
      // OUAT Data
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
        console.log(err);
        this.logger.error('error getting data from OUAT', err);
        this.logger.warn('skipped adding data from OUAT');
      }
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
