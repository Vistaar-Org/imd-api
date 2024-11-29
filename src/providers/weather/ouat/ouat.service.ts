import { Injectable } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { OUAT_ORIA_DISTRICTS } from "../../../app.constants";
import { readMultipleJSONs } from "../../../app.utils";
import { ODISHA_DISTRICTS } from "../../../constants/odisha-districts";
import { mapOUATWeather } from "../../../beckn.utils";

@Injectable()
export class OUATWeatherService {

  constructor(private readonly logger: Logger) {}

  private async fetchWeatherDataFromOUAT(district: string) {
    district = !ODISHA_DISTRICTS.includes(district.toLowerCase())
      ? 'khordha'
      : district.toLowerCase();

    // fetching data from OUAT
    const startTime = performance.now();
    const filePaths = [`ouat/${district}.json`];
    const [ouatData]: any[] =
      await readMultipleJSONs(filePaths);
    const endTime = performance.now();
    this.logger.verbose(
      `Time taken to read OUAT data JSON: ${endTime - startTime}`,
    );

    return ouatData;
  }

  /**
   * Fetches weather data from OUAT
   * @returns weather data
   */
  async getWeather(district: string) {
    try {
      const weather = await this.fetchWeatherDataFromOUAT(district);
      console.log('weather: ', weather);
      const mappedWeather = mapOUATWeather(weather);
      console.log('mappedWeather: ', mappedWeather);
      return mappedWeather;
    } catch (err) {
      console.log(err);
      this.logger.error('Error fetching weather data from OUAT', err);
    }
  }
} 