import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { getDistanceFromLatLonInKm, sanitizeIMDWeather } from "../../../app.utils";
import * as fs from 'fs';
import * as path from 'path';
import { format } from 'date-fns';
import { IMD_CITY_WEATHER_INFO } from '../../../app.constants';
import { mapIMDItems } from '../../../beckn.utils';
import { DUMMY_WEATHER } from '../../../constants/responses';

@Injectable()
export class IMDWeatherService {
  constructor(private readonly logger: Logger) {
    this.logger = new Logger('IMDWeatherService');
  }

  private getStationId(lat: string, long: string): string {
    const map = JSON.parse(
      // TODO: Move this to constants
      fs.readFileSync(path.join(__dirname + '../../../../db/station_map.json'), {
        encoding: 'utf-8',
      }),
    );
    const latLongStr = lat + '-' + long;
    let code = map[latLongStr]?.code;
    if (!code) {
      // calculate within radius
      let minDist = Math.pow(10, 1000);

      const keys = Object.keys(map);
      keys.forEach((pair) => {
        const [keyLat, keyLong] = pair.split('-');
        const dist = getDistanceFromLatLonInKm(lat, long, keyLat, keyLong);
        if (dist < minDist) {
          minDist = dist;
          code = map[pair].code;
        }
      });
    }
    this.logger.verbose(`Station Code: ${code} has been found for lat: ${lat} and long: ${long}`);
    return code;
  };

  private async fetchWeatherData(lat: string, long: string) {
    try {
      let startTime = performance.now();
      const stationId = this.getStationId(lat, long);
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

      return {
        imd: forecastData,
        visualCrossing: {},
        future: [],
      };
    } catch (err) {
      this.logger.error('Error resolving API Calls', err);
    }
  }

  async getWeather(latitude: string, longitude: string) {
    try {
      let startTime = performance.now();
      const imdData = await this.fetchWeatherData(latitude, longitude);
      let endTime = performance.now();
      this.logger.verbose(
        `Time taken to get weather data from IMD: ${endTime - startTime}`,
      );
      startTime = performance.now();
      let date = new Date(Date.now()).toDateString();
      try {
        date = format(new Date(Date.now()), 'yyyy-MM-dd');
      } catch (err) {
        this.logger.error('error in formatting date: ', err);
      }

      const sanitizedIMDData = sanitizeIMDWeather(imdData);
      endTime = performance.now();
      this.logger.verbose(
        `Time taken to sanitize IMD data: ${endTime - startTime}`,
      );
      const imdItems = mapIMDItems(sanitizedIMDData);
      return imdItems ? imdItems : DUMMY_WEATHER;
    } catch (err) {
      console.error(err);
      this.logger.error('Error fetching weather data from IMD');
    }
  }
}
