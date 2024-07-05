import * as fs from 'fs';
import * as path from 'path';
import { IMDCityWeatherAPIObject } from './types/imd.types';

export const IMD_CITY_WEATHER_INFO: IMDCityWeatherAPIObject = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/imd/imd.json'), {
    encoding: 'utf-8',
  }),
) as IMDCityWeatherAPIObject;
