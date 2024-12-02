import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  CROP_MAPPINGS,
  getRajaiStationId,
  getStationId,
  sanitizeIMDWeather,
  sanitizeRAJAIWeather,
} from './app.utils';
import { mapIMDItems, mapAdvisoryData, mapOUATWeather } from './beckn.utils';
import { generateContext } from './beckn.utils';
import { ADVISORY_PROVIDERS, WEATHER_PROVIDERS } from './constants/enums';
import {
  IMD_CITY_WEATHER_INFO,
  OUAT_ORIA_DISTRICTS,
  RAJKMAI_WEATHER_INFO,
} from './app.constants';
import { ODISHA_DISTRICTS } from './constants/odisha-districts';
import { format } from 'date-fns';
import { DUMMY_WEATHER } from './constants/responses';
import { MinIOService } from './minio/minio.service';

@Injectable()
export class AppService {
  private readonly logger: Logger;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly minioService: MinIOService,
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
      // startTime = performance.now();
      // let visualCrossing;
      // try {
      //   visualCrossing = await this.httpService.axiosRef.get(
      //     `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat}%2C${long}?unitGroup=metric&key=DK34QYLLWYWRKMXGCXPFFP6SR&contentType=json`,
      //   );
      // } catch (err) {
      //   console.error('error fetching visual crossing data: ', err);
      // }
      // endTime = performance.now();
      // this.logger.verbose(
      //   `Time taken to get visual crossing data: ${endTime - startTime}`,
      // );

      // console.log('forecast data: ', forecastData);
      return {
        imd: forecastData,
        visualCrossing: {},
        future: [],
      };
    } catch (err) {
      this.logger.error('Error resolving API Calls', err);
    }
  }

  async getWeatherFromRajKisan(lat: string, long: string) {
    try {
      let startTime = performance.now();
      let stationName = getRajaiStationId(lat, long);
      let endTime = performance.now();
      this.logger.verbose(
        `Time taken to get stationId from lat long: ${endTime - startTime}`,
      );

      if (!stationName) {
        stationName = { eng: 'jaipur', hin: 'जयपुर' };
      }

      startTime = performance.now();
      let forecastData = RAJKMAI_WEATHER_INFO[stationName.eng];
      if (!forecastData) {
        forecastData = RAJKMAI_WEATHER_INFO['jaipur'];
      }
      endTime = performance.now();
      this.logger.verbose(
        `Time taken to get Rajkmai data from JSON: ${endTime - startTime}`,
      );
      startTime = performance.now();
      let visualCrossing;
      try {
        visualCrossing = await this.httpService.axiosRef.get(
          `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat}%2C${long}?unitGroup=metric&key=DK34QYLLWYWRKMXGCXPFFP6SR&contentType=json`,
        );
      } catch (err) {
        console.error('error fetching visual crossing data: ', err);
      }
      console.log('visual crossing data: ', visualCrossing.data);
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

  async getAdvisoryFromRajai() {
    try {
      const startTime = performance.now();
      const filePaths = [
        'rajkisan-advisory/latest.json',
        'rajkisan-advisory/latest_hindi.json',
      ];
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
    weatherProvider?: string,
  ) {
    if (!provider) provider = ADVISORY_PROVIDERS.UPCAR;
    if (!weatherProvider) weatherProvider = WEATHER_PROVIDERS.IMD;
    let imdItems = undefined,
      upcarItems = undefined,
      rajaiItems = undefined,
      ouatWeatherItems = undefined,
      ouatAdvisoryItems = undefined;

    // RAJAI Data
    if (weatherProvider === WEATHER_PROVIDERS.RAJAI) {
      console.log('====== INSIDE RAJAI WEATHER PROVIDER ======');
      try {
        let startTime = performance.now();
        const rajaiData = await this.getWeatherFromRajKisan(lat, long);
        console.log('rajai-data: ', rajaiData);
        let endTime = performance.now();
        this.logger.verbose(
          `Time taken to get weather data from Rajkmai: ${endTime - startTime}`,
        );
        startTime = performance.now();
        let date = new Date(Date.now()).toDateString();
        try {
          date = format(new Date(Date.now()), 'yyyy-MM-dd');
        } catch (err) {
          console.error('error in formatting date: ', err);
        }
        if (!rajaiData || !rajaiData.imd) {
          rajaiData.imd = {
            district_name: district,
            date: date,
            Todays_Forecast: rajaiData.visualCrossing.conditions,
          };
        }

        const sanitizedRAJAIData = sanitizeRAJAIWeather(rajaiData);
        endTime = performance.now();
        this.logger.verbose(
          `Time taken to sanitize RAJAI data: ${endTime - startTime}`,
        );
        console.log('sanitized rajkmai Data: ', sanitizedRAJAIData);
        rajaiItems = mapIMDItems(sanitizedRAJAIData);
        rajaiItems.id = 'rajai';
      } catch (err) {
        console.error(err);
        this.logger.error('Error fetching weather data from IMD', err);
      }
    }
    // IMD Data
    if (weatherProvider === WEATHER_PROVIDERS.IMD) {
      try {
        let startTime = performance.now();
        const imdData = await this.getWeatherFromIMD(lat, long);
        // console.log('imdData: ', imdData);
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
        // if (!imdData.imd) {
        //   imdData.imd = {
        //     Station_Name: district,
        //     date: date,
        //     Todays_Forecast: imdData.visualCrossing.conditions,
        //   };
        // }
        // console.log('imdData after if: ', imdData);

        const sanitizedIMDData = sanitizeIMDWeather(imdData);
        // console.log('sanitizedIMDData: ', sanitizedIMDData);

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
    }
    // upcar data
    if (provider === ADVISORY_PROVIDERS.UPCAR) {
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

    // ouat data
    let ouatData = undefined;
    if (provider === ADVISORY_PROVIDERS.OUAT) {
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

    // RAJAI data
    let rajaiAdvisory = undefined;
    if (provider === ADVISORY_PROVIDERS.RAJAI) {
      try {
        const { englishData, hindiData } = await this.getAdvisoryFromRajai();
        rajaiAdvisory = mapAdvisoryData(englishData, 'rajai');
        const upcarHindiProvider = mapAdvisoryData(hindiData, 'rajai');
        const hindiItems = upcarHindiProvider.items.map((item) => {
          if (CROP_MAPPINGS[item.code]) {
            item.descriptor.name = CROP_MAPPINGS[item.code].hi;
          }
          item.category_ids.push('hi_translated');
          return item;
        });
        rajaiAdvisory.items.push(...hindiItems);
        rajaiAdvisory.categories.push({
          id: 'hi_translated',
        });
      } catch (err) {
        this.logger.error('Error fetching advisory data from RJAI', err);
      }
    }

    return {
      context: generateContext(),
      message: {
        catalog: {
          providers: [
            rajaiItems ? rajaiItems : imdItems ? imdItems : DUMMY_WEATHER,
            ouatWeatherItems ? ouatWeatherItems : undefined,
            upcarItems ? upcarItems : undefined,
            ouatAdvisoryItems ? ouatAdvisoryItems : undefined,
            rajaiAdvisory ? rajaiAdvisory : undefined,
          ].filter((item) => item != undefined),
        },
      },
    };
  }

  async transliterate(
    str: string,
    inputLang: string,
    outputLang: string,
  ): Promise<string> {
    try {
      const resp = await this.httpService.axiosRef.post(
        'https://ai-tools-proxy.bhasai-dev.k8s.bhasai.samagra.io/transliterate',
        {
          inputLanguage: inputLang,
          outputLanguage: outputLang,
          input: str,
          provider: 'bhashini',
        },
      );
      return resp.data.suggestions[0] as string;
    } catch (err) {
      this.logger.error('Error while transliterating', err);
      throw new InternalServerErrorException(
        `Error while transliterating: ${err}`,
      );
    }
  }

  updateCrops(data: any) {
    fs.writeFileSync(path.join(__dirname, `db/crop-translations.json`), JSON.stringify(data, null, 2));
    this.minioService.uploadFile('vistaar', `crop-translations.json`, Buffer.from(JSON.stringify(data, null, 2)), 'application/json');
    return { message: 'Crops updated successfully' };
  }

  updateConditions(data: any) {
    fs.writeFileSync(path.join(__dirname, `db/conditions.json`), JSON.stringify(data, null, 2));
    this.minioService.uploadFile('vistaar', `conditions.json`, Buffer.from(JSON.stringify(data, null, 2)), 'application/json');
    return { message: 'Conditions updated successfully' };
  }

  getConditions() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, `db/conditions.json`), 'utf-8'));
  }

  getCrops() {
    return JSON.parse(fs.readFileSync(path.join(__dirname, `db/crop-translations.json`), 'utf-8'));
  }
}
