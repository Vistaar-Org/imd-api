import * as fs from 'fs';
import * as path from 'path';
import { format, addDays, parse } from 'date-fns';
import { BadRequestException } from '@nestjs/common';
import { IMDCityWeatherAPIObject } from './types/imd.types';
import {
  IMDFutureWeatherDetails,
  SanitizedIMDWeather,
} from './types/app.types';
import { VisualCrossingCurrentConditionsObject } from './types/visual-crossing.types';

export const WIND_DIRECTIONS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/db/wind-directions.json'), {
    encoding: 'utf-8',
  }),
);

export const CROP_MAPPINGS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/db/crop-translations.json'), {
    encoding: 'utf-8',
  }),
);

export enum CONDITIONS {
  SUNNY = 'Sunny',
  CLOUDY = 'Cloudy',
  LIGHT_RAIN = 'Light Rain',
  HEAVY_RAIN = 'Heavy Rain',
  THUNDERSTORM = 'Thunderstorm',
  WINDY = 'Windy',
}

export const WEATHER_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname + '/db/conditions.json'), {
    encoding: 'utf-8',
  }),
);

export const CROP_IMAGES = JSON.parse(
  fs.readFileSync(path.join(__dirname + '/db/crops.json'), {
    encoding: 'utf-8',
  }),
);

export const calculateDate = (baseDate: string, daysToAdd: number): string => {
  const date = new Date(baseDate);
  const newDate = addDays(date, daysToAdd);
  return format(newDate, 'yyyy-MM-dd');
};

export const sanitizeLatLong = (lat: string, long: string) => {
  const [latSplit, longSplit] = [lat?.split('.')[1], long?.split('.')[1]];

  if (!lat || !long || latSplit.length < 4 || longSplit.length < 4) {
    throw new BadRequestException(
      'Make sure your coordinates are valid to only 4 decimal places.',
    );
  }

  return {
    latitude: lat.slice(0, 7),
    longitude: long.slice(0, 7),
  };
};

export const getStationId = (
  lat: string,
  long: string,
  dist: number,
): string => {
  const map = JSON.parse(
    fs.readFileSync(path.join(__dirname + '/db/base.json'), {
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
        // console.log('dist: ', dist);
        minDist = dist;
        code = map[pair].code;
        // console.log('code: ', code);
      }
    });
  }
  return code;
};

export const calculateWeatherConditions = (
  cloudCover = 0,
  windSpeed = 0,
  rainfall = 0,
) => {
  // classify
  let weather = CONDITIONS.SUNNY;
  if (cloudCover == 0 && windSpeed == 0 && rainfall == 0) {
    weather = CONDITIONS.SUNNY;
  } else if (cloudCover > 2 && rainfall == 0) {
    weather = CONDITIONS.CLOUDY;
  } else if (rainfall > 0) {
    weather = CONDITIONS.LIGHT_RAIN;
  } else if (windSpeed > 30) {
    weather = CONDITIONS.WINDY;
  } else if (windSpeed > 45) {
    weather = CONDITIONS.THUNDERSTORM;
  }
  return weather;
};

// This function will take wind direction in degrees and language and return the translated string
export const getWindDirection = (windDirection: number, lang: string) => {
  // windDirection value may not be present in the WIND_DIRECTIONS object, let say 30
  // so we need to find the nearest value to the given windDirection
  const keys = Object.keys(WIND_DIRECTIONS); // [0, 20, 50, 70, 90, 110, 140, 160, 180, 200, 230, 250, 270, 290, 320, 340, 360]
  let nearestKey = keys[0]; // 0
  let minDiff = Math.abs(windDirection - parseInt(nearestKey)); // 30
  keys.forEach((key) => {
    const diff = Math.abs(windDirection - parseInt(key));
    if (diff < minDiff) {
      minDiff = diff;
      nearestKey = key;
    }
  });
  windDirection = parseInt(nearestKey); // 20
  return WIND_DIRECTIONS[windDirection][lang];
};

export const deduceWeatherCondition = (forecast: string): string => {
  // forecast = "Generally cloudy sky with possibility of rain or Thunderstorm"

  forecast = forecast.toLowerCase();
  const keys: string[] = Object.keys(CONDITIONS);
  const values: string[] = Object.values(CONDITIONS);

  let condition: string = CONDITIONS.SUNNY;

  for (let i = 0; i < keys.length; i++) {
    // string to match in forecast
    const conditionString = values[i].toLowerCase();
    // create a regex to match the condition string in a case-insensitive manner
    const regex = new RegExp(conditionString, 'gi');
    // check if the forecast contains the condition
    if (regex.test(forecast)) {
      condition = values[i];
    }
  }
  return condition; // Thunderstorm
  // If CONDITIONS enum is prioritiwise ordered, then the last matching condition will be returned
};

/**
 * @description This function cleans out the IMD data and adds visual crossing as a fallback
 * in case the data is absent
 *
 * Fields of Relevance in Current Day data:
 * 1. Current Temp - Get from Visual crossing - temp
 * 2. Cloud Cover - Get from visual crossing - cloudcover
 * 3. Humidity - Get from IMD - Relative_Humidity_at_0830
 * 4. Wind Speed - Get from Visual Crossing - windspeed
 * 5. Wind Direction - Get from Visual Crossing - winddir
 *
 * Fields of relevance in future data:
 * 1. Max Temp - Get from IMD -
 * 2. Min Temp - Get from IMD -
 * 3. Forecast - Get from IMD -
 */
export const sanitizeIMDWeather = (data: {
  imd: IMDCityWeatherAPIObject;
  visualCrossing: VisualCrossingCurrentConditionsObject;
}): SanitizedIMDWeather => {
  const { imd, visualCrossing } = data;
  // extract fields of relevance from visual crossing.
  const sanitizedWeatherInfo: SanitizedIMDWeather = {
    general: {
      station: imd.Station_Name,
      date: imd.Date,
    },
    current: {
      temp: visualCrossing.temp,
      cloudCover: visualCrossing.cloudcover,
      humidity: imd.Relative_Humidity_at_0830,
      windSpeed: visualCrossing.windspeed,
      windDirection: visualCrossing.winddir,
      conditions: imd.Todays_Forecast,
    },
    future: parseIMDFutureItems(imd),
  };

  return sanitizedWeatherInfo;
};

/**
 * @description This function takes in the IMD `cityweather_loc` API input and parse it for future information
 * @param station
 * @returns
 */
export const parseIMDFutureItems = (
  station: IMDCityWeatherAPIObject,
): ReadonlyArray<IMDFutureWeatherDetails> => {
  const baseDate = station.Date;
  const items = [];
  for (let dayOffset = 2; dayOffset <= 7; dayOffset++) {
    const dayKeyMax = `Day_${dayOffset}_Max_Temp`;
    const dayKeyMin = `Day_${dayOffset}_Min_temp`;
    const dayKeyForecast = `Day_${dayOffset}_Forecast`;

    if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
      const newDate = calculateDate(baseDate, dayOffset - 1);
      const conditions = deduceWeatherCondition(station[dayKeyForecast]);
      items.push({
        date: newDate,
        conditions,
        temp_max: station[dayKeyMax],
        temp_min: station[dayKeyMin],
      });
    }
  }

  return items;
};

export const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

export const getParsedDate = (date) => {
  const dateRegexes = [
    /^\d{2}-\d{2}-\d{4}$/, // dd-mm-yyyy
    /^\d{2}\/\d{2}\/\d{4}$/, // dd/mm/yyyy
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{4}\/\d{2}\/\d{2}$/, // yyyy/mm/dd
  ];

  if (dateRegexes[0].test(date)) {
    return parse(date, 'dd-mm-yyyy', new Date());
  } else if (dateRegexes[1].test(date)) {
    return parse(date, 'dd/mm/yyyy', new Date());
  } else if (dateRegexes[2].test(date)) {
    return parse(date, 'yyyy-mm-dd', new Date());
  } else if (dateRegexes[3].test(date)) {
    return parse(date, 'yyyy/mm/dd', new Date());
  }
};
