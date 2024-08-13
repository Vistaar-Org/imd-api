import * as fs from 'fs';
import * as path from 'path';
import { IMDCityWeatherAPIObject } from './types/imd.types';

export const IMD_CITY_WEATHER_INFO: IMDCityWeatherAPIObject = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data/imd/imd.json'), {
    encoding: 'utf-8',
  }),
) as IMDCityWeatherAPIObject;

export const OUAT_ORIA_DISTRICTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'db/ouat-oria.json'), {
    encoding: 'utf-8',
  }),
);
