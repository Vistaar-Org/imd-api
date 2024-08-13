import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CROP_MAPPINGS, getStationId, sanitizeIMDWeather } from './app.utils';
import { mapIMDItems, mapAdvisoryData, mapOUATWeather } from './beckn.utils';
import { generateContext } from './beckn.utils';
import { PROVIDERS } from './constants/enums';
import { IMD_CITY_WEATHER_INFO, OUAT_ORIA_DISTRICTS } from './app.constants';
import { ODISHA_DISTRICTS } from './constants/odisha-districts';
import { format } from 'date-fns';
import { DUMMY_WEATHER } from './constants/responses';

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

  private async readMultipleJSONs(filePaths: ReadonlyArray<string>) {
    const asynFileSystem = fs.promises;
    const promises = filePaths.map((filePath) =>
      asynFileSystem
        .readFile(path.join(__dirname, `/data/${filePath}`), {
          encoding: 'utf-8',
        })
        .then(JSON.parse),
    );

    return await Promise.all(promises);
  }

  private async getDataFromOUAT(district: string) {
    district = !ODISHA_DISTRICTS.includes(district.toLowerCase())
      ? 'khordha'
      : district.toLowerCase();

    // fetching data from OUAT
    const startTime = performance.now();
    const filePaths = [`ouat/${district}.json`, `ouat/odia/${district}.json`];
    const [englishData, odiaData]: any[] =
      await this.readMultipleJSONs(filePaths);
    const endTime = performance.now();
    this.logger.verbose(
      `Time taken to read OUAT data JSON: ${endTime - startTime}`,
    );
    englishData['district'] = district;
    odiaData['district'] = OUAT_ORIA_DISTRICTS[district];
    return { englishData, odiaData };
  }

  private async getWeatherFromIMD(lat: string, long: string) {
    try {
      // const dist = this.configService.get<number>('IMD_MIN_STATION_DISTANCE');
      let startTime = performance.now();
      const stationId = getStationId(lat, long);
      let endTime = performance.now();
      this.logger.verbose(
        `Time taken to get stationId from lat long: ${endTime - startTime}`,
      );
      if (!stationId) {
        throw new InternalServerErrorException(
          'No IMD weather station found for the sent coordinates.',
        );
      }
      startTime = performance.now();
      let forecastData = IMD_CITY_WEATHER_INFO[stationId];
      if (!forecastData) {
        forecastData =
          IMD_CITY_WEATHER_INFO[Object.keys(IMD_CITY_WEATHER_INFO)[0]];
      }
      endTime = performance.now();
      this.logger.verbose(
        `Time taken to get IMD data from JSON: ${endTime - startTime}`,
      );
      startTime = performance.now();
      let visualCrossing;
      try {
        visualCrossing = await this.httpService.axiosRef.get(
          `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat}%2C${long}?unitGroup=metric&key=BD7YU52NGHX9EDTQTYQ66DLSD&contentType=json`,
        );
      } catch (err) {
        console.error('error fetching visual crossing data: ', err);
      }
      endTime = performance.now();
      this.logger.verbose(
        `Time taken to get visual crossing data: ${endTime - startTime}`,
      );

      console.log('forecast data: ', forecastData);
      return {
        imd: forecastData,
        visualCrossing: visualCrossing.data.currentConditions,
        future: visualCrossing.data.days.slice(1, 5),
      };
    } catch (err) {
      this.logger.error('Error resolving API Calls', err);
    }
  }

  async getAdvisoryFromUpcar() {
    try {
      const startTime = performance.now();
      const filePaths = ['upcar/latest.json', 'upcar/latest_hindi.json'];
      const [englishData, hindiData] = await this.readMultipleJSONs(filePaths);
      const endTime = performance.now();
      this.logger.verbose(
        `Time taken to get upcar data: ${endTime - startTime}`,
      );
      return { englishData, hindiData };
    } catch (err) {
      this.logger.error('Error while fetching advisory data from UPCAR', err);
    }
  }

  async getWeather(
    lat: string,
    long: string,
    district: string,
    provider?: string,
  ) {
    if (!provider) provider = PROVIDERS.UPCAR;
    let imdItems = undefined,
      upcarItems = undefined,
      ouatWeatherItems = undefined,
      ouatAdvisoryItems = undefined;
    // IMD Data
    try {
      let startTime = performance.now();
      const imdData = await this.getWeatherFromIMD(lat, long);
      console.log('imdData: ', imdData);
      let endTime = performance.now();
      this.logger.verbose(
        `Time taken to get weather data from IMD: ${endTime - startTime}`,
      );
      startTime = performance.now();
      let date = new Date(Date.now()).toDateString();
      try {
        date = format(new Date(Date.now()), 'yyyy-MM-dd');
      } catch (err) {
        console.error('error in formatting date: ', err);
      }
      if (!imdData.imd) {
        imdData.imd = {
          Station_Name: district,
          date: date,
          Todays_Forecast: imdData.visualCrossing.conditions,
        };
      }
      console.log('imdData after if: ', imdData);

      const sanitizedIMDData = sanitizeIMDWeather(imdData);
      console.log('sanitizedIMDData: ', sanitizedIMDData);

      endTime = performance.now();
      this.logger.verbose(
        `Time taken to sanitize IMD data: ${endTime - startTime}`,
      );
      // console.log('imdData: ', imdData);
      imdItems = mapIMDItems(sanitizedIMDData);
    } catch (err) {
      console.error(err);
      this.logger.error('Error fetching weather data from IMD', err);
    }

    // upcar data
    if (provider === PROVIDERS.UPCAR) {
      try {
        const { englishData, hindiData } = await this.getAdvisoryFromUpcar();
        upcarItems = mapAdvisoryData(englishData, 'upcar');
        const upcarHindiProvider = mapAdvisoryData(hindiData, 'upcar');
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
        ouatData = await this.getDataFromOUAT(district);
        if (ouatData['ERROR']) {
          throw new InternalServerErrorException(
            `OUAT API is failing with the following error: ${ouatData['ERROR']}`,
          );
        }
        const englishData = ouatData.englishData;
        const odiaData = ouatData.odiaData;
        ouatWeatherItems = mapOUATWeather(englishData);
        ouatAdvisoryItems = mapAdvisoryData(englishData, 'ouat');
        const ouatAdvisoryOdiaItems = mapAdvisoryData(odiaData, 'ouat');
        const odiaItems = ouatAdvisoryOdiaItems.items.map((item) => {
          if (CROP_MAPPINGS[item.code]) {
            item.descriptor.name = CROP_MAPPINGS[item.code].or;
          }
          item.category_ids.push('or_translated');
          return item;
        });
        ouatAdvisoryItems.items.push(...odiaItems);
        ouatAdvisoryItems.categories.push({
          id: 'or_translated',
        });
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
            imdItems ? imdItems : DUMMY_WEATHER,
            ouatWeatherItems ? ouatWeatherItems : undefined,
            upcarItems ? upcarItems : undefined,
            ouatAdvisoryItems ? ouatAdvisoryItems : undefined,
          ].filter((item) => item != undefined),
        },
      },
    };
  }
}
