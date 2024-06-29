import * as fs from 'fs';
import * as path from 'path';
import { format, addDays } from 'date-fns';
import { BadRequestException } from '@nestjs/common';

export enum CONDITIONS {
  DEFAULT = 'default',
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

export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
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
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
