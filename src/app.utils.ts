import * as fs from 'fs';
import * as path from 'path';
import { format, addDays } from 'date-fns';
import { BadRequestException } from '@nestjs/common';

enum CONDITIONS {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  LIGHT_RAIN = 'light_rain',
  HEAVY_RAIN = 'heavy_rain',
  THUNDERSTORM = 'thunderstorm',
}

const WEATHER_DATA = JSON.parse(
  fs.readFileSync(path.join(__dirname + '/conditions.json'), {
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
    fs.readFileSync(path.join(__dirname + '/base.json'), {
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
        console.log('dist: ', dist);
        minDist = dist;
        code = map[pair].code;
        console.log('code: ', code);
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
  // if (cloudCover == 0 && windSpeed == 0 && rainfall == 0) {
  //   weather = CONDITIONS.SUNNY;
  // } else if (cloudCover > 2 && rainfall == 0) {
  // }
  return weather;
};

export const mapIMDItems = (imdJSON) => {
  let { sevenDay, current } = imdJSON;
  sevenDay = sevenDay[0];
  const items = [];

  if (typeof current !== typeof 'string') {
    current.forEach((item) => {
      // get conditions here
      const conditions = calculateWeatherConditions();
      items.push({
        descriptor: {
          images: [
            {
              url: WEATHER_DATA[conditions].image_day,
              type: 'image_day',
            },
            {
              url: WEATHER_DATA[conditions].image_night,
              type: 'image_night',
            },
            {
              url: WEATHER_DATA[conditions].icon,
              type: 'icon',
            },
          ],
        },
        time: {
          label: 'Date of Observation',
          timestamp: item['Date of Observation'],
        },
        location_ids: [item['Station']],
        category_ids: ['current_weather'], //TODO: turn this into an ENUM
        tags: {
          conditions: conditions,
          conditions_hi: WEATHER_DATA[conditions].hi_translated,
          conditions_or: WEATHER_DATA[conditions].or_translated,
          temp: item['Temperature'],
          humidity: item['Humidity'],
          winddir: item['Wind Direction'],
          windspeed: item['Wind Speed KMPH'],
          rainfall: sevenDay?.Past_24_hrs_Rainfall,
          temp_max: sevenDay?.Today_Max_temp,
          temp_min: sevenDay?.Today_Min_temp,
          rh_max: sevenDay?.Relative_Humidity_at_0830,
          rh_min: sevenDay?.Relative_Humidity_at_1730,
          cloud_cover: 'NA', // Not available in IMD data
          Sunset_time: sevenDay?.Sunset_time,
          Sunrise_time: sevenDay?.Sunrise_time,
          Moonset_time: sevenDay?.Moonset_time,
          Moonrise_time: sevenDay?.Moonrise_time,
        },
      });
    });
  }

  return {
    id: 'imd', // TODO: Turn this into an enum,
    category_id: 'weather_provider',
    categories: [
      {
        id: 'current_weather',
      },
      {
        id: 'future_weather',
      },
    ],
    items: items.concat(mapIMDFutureItems(sevenDay)),
  };
};

export const mapIMDFutureItems = (station) => {
  const baseDate = station.Date;
  const items = [];
  for (let dayOffset = 2; dayOffset <= 7; dayOffset++) {
    const dayKeyMax = `Day_${dayOffset}_Max_Temp`;
    const dayKeyMin = `Day_${dayOffset}_Min_temp`;
    const dayKeyForecast = `Day_${dayOffset}_Forecast`;

    if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
      const newDate = calculateDate(baseDate, dayOffset - 1);
      const conditions = calculateWeatherConditions();
      items.push({
        descriptor: {
          images: [
            {
              url: WEATHER_DATA[conditions].image_day,
              type: 'image_day',
            },
            {
              url: WEATHER_DATA[conditions].image_night,
              type: 'image_night',
            },
            {
              url: WEATHER_DATA[conditions].icon,
              type: 'icon',
            },
          ],
        },
        time: { label: 'Future Date of Forecast', timestamp: newDate },
        location_ids: [station.Station_Name],
        category_ids: ['future_weather'], // TODO: Turn this into an enum
        tags: {
          rainfall: 'NA', // Not available in IMD data
          temp_max: station[dayKeyMax],
          temp_min: station[dayKeyMin],
          conditions_hi: WEATHER_DATA[conditions].hi_translated,
          conditions_or: WEATHER_DATA[conditions].or_translated,
          conditions: station[dayKeyForecast], // Not available in IMD data
          temp: 'NA', // Not available in IMD data
          humidity: 'NA', // Not available in IMD data
          winddir: 'NA', // Not available in IMD data
          windspeed: 'NA', // Not available in IMD data
          rh_max: 'NA', // Not available in IMD data
          rh_min: 'NA', // Not available in IMD data
          cloud_cover: 'NA', // Not available in IMD data
        },
      });
    }
  }

  return items;
};

export const mapAdvisoryData = (upcarData, provider) => {
  const items = [];
  // map general advisory
  items.push({
    category_ids: ['general_advisory'],
    code: 'general',
    descriptor: {
      name: 'General Crop Advisory',
      long_desc: upcarData.general_advisory,
    },
  });
  // map crop specific stuff
  Object.keys(upcarData.crops_data).forEach((key) => {
    items.push({
      category_ids: ['crop_specific_advisory'],
      code: key,
      descriptor: {
        name: `advisory on crop ${key}`,
        long_desc: upcarData.crops_data[key].advisory.join('\n'),
      },
    });
  });

  return {
    id: provider, // TODO: Turn this into an enum,
    category_id: 'crop_advisory_provider',
    categories: [
      {
        id: 'general_advisory',
      },
      {
        id: 'crop_specific_advisory',
      },
    ],
    items: items,
  };
};

export const mapOUATWeather = (ouatWeatherData) => {
  const items = [];
  const weatherDetails = ouatWeatherData['weather_details'];
  Object.keys(weatherDetails).forEach((date) => {
    const station = weatherDetails[date];
    const conditions = calculateWeatherConditions();
    items.push({
      descriptor: {
        images: [
          {
            url: WEATHER_DATA[conditions].image_day,
            type: 'image_day',
          },
          {
            url: WEATHER_DATA[conditions].image_night,
            type: 'image_night',
          },
          {
            url: WEATHER_DATA[conditions].icon,
            type: 'icon',
          },
        ],
      },
      time: {
        label: 'Future Date of Forecast',
        timestamp: format(date, 'yyyy-MM-dd'),
      },
      location_ids: [station.district],
      category_ids: ['future_weather'], // TODO: Turn this into an enum
      tags: {
        rainfall: station.rainfall,
        temp_max: station.t_max,
        temp_min: station.t_min,
        conditions_hi: WEATHER_DATA[conditions].hi_translated,
        conditions_or: WEATHER_DATA[conditions].or_translated,
        conditions: 'NA', // Not available in OUAT data
        temp: 'NA', // Not available in OUAT data
        humidity: 'NA', // Not available in OUAT data
        winddir: station.wind_direction, // Not available in OUAT data
        windspeed: station.wind_speed, // Not available in OUAT data
        rh_max: station.rh_max, // Not available in OUAT data
        rh_min: station.rh_min, // Not available in OUAT data
        wind_speed: 'NA', // Not available in OUAT data
        wind_direction: 'NA', // Not available in OUAT data
        cloud_cover: station.cloud_cover, // Not available in OUAT data
      },
    });
  });

  return {
    id: 'ouat', // TODO: Turn this into an enum,
    category_id: 'weather_provider',
    categories: [
      {
        id: 'future_weather',
      },
    ],
    items: items,
  };
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
