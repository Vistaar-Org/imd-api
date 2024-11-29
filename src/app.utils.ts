import * as fs from 'fs';
import * as path from 'path';
import { format, addDays } from 'date-fns';
import { IMDCityWeatherAPIObject } from './types/imd.types';
import {
  IMDFutureWeatherDetails,
  SanitizedIMDWeather,
} from './types/app.types';
import { VisualCrossingCurrentConditionsObject } from './types/visual-crossing.types';
import { RAJKISAN_DISTRICTS } from './app.constants';

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

export const STATION_NAME_HIN = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/db/imd-hindi.json'), {
    encoding: 'utf-8',
  }),
);

export const STATION_NAME_OR = JSON.parse(
  fs.readFileSync(path.join(__dirname, '/db/imd-oria.json'), {
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

export const calculateDate = (baseDate: string, daysToAdd: number): string => {
  console.log('baseDate: ', baseDate);
  const date = new Date(baseDate);
  const newDate = addDays(date, daysToAdd);
  return format(newDate, 'yyyy-MM-dd');
};

export function compareDateToToday(dateString) {
  // Convert the input date string to a Date object
  const inputDate = new Date(dateString);

  // Get today's date
  const today = new Date();

  // Set the hours, minutes, seconds, and milliseconds to zero for accurate date comparison
  today.setHours(0, 0, 0, 0);
  inputDate.setHours(0, 0, 0, 0);

  // Compare the dates
  if (inputDate < today) {
    return -1;
  } else if (inputDate > today) {
    return 1;
  } else {
    return 0;
  }
}

export const sanitizeLatLong = (lat: string, long: string) => {
  let [latSplit, longSplit] = [lat?.split('.')[1], long?.split('.')[1]];

  if (!lat || !long || latSplit.length < 4 || longSplit.length < 4) {
    latSplit += '0000';
    longSplit += '0000';
  }

  return {
    latitude: lat,
    longitude: long,
  };
};

export const getStationId = (lat: string, long: string): string => {
  const map = JSON.parse(
    fs.readFileSync(path.join(__dirname + '/db/station_map.json'), {
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
  console.log('code: ', code);
  return code;
};

export const getRajaiStationId = (
  lat: string,
  long: string,
): { eng: string; hin: string } => {
  const stations = JSON.parse(
    fs.readFileSync(path.join(__dirname + '/data/rajkisan/locations.json'), {
      encoding: 'utf-8',
    }),
  );

  // calc minimum distance between the given lat long and the station lat long using the lat long distance calc function in this file
  let minDist = Math.pow(10, 1000);
  let stationName = { eng: '', hin: '' };
  const keys = Object.keys(stations);
  for (let i = 0; i < keys.length; i++) {
    const station = stations[keys[i]];
    const dist = getDistanceFromLatLonInKm(
      lat,
      long,
      station.latitude,
      station.longitude,
    );
    if (dist < minDist) {
      console.log('dist: ', dist);
      minDist = dist;
      stationName = { eng: station.eng, hin: station.hin };
      console.log('code: ', stationName);
    }
  }

  return stationName;
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
  // visualCrossing: VisualCrossingCurrentConditionsObject | any;
  future: ReadonlyArray<VisualCrossingCurrentConditionsObject>;
}): SanitizedIMDWeather => {
  const { imd, future } = data;
  // extract fields of relevance from visual crossing.
  const date = new Date(Date.now()).toISOString().split('T')[0];
  const sanitizedWeatherInfo: SanitizedIMDWeather = {
    general: {
      station: imd?.Station_Name,
      station_hindi: STATION_NAME_HIN[imd?.Station_Code],
      station_oria: STATION_NAME_OR[imd?.Station_Code],
      date: date,
    },
    current: {
      temp:
        ((parseInt(imd.Today_Max_temp) ?? 0) +
          (parseInt(imd.Today_Min_temp) ?? 0)) /
        2,
      cloudCover: 0,
      humidity: imd.Relative_Humidity_at_1730,
      windSpeed: 0,
      windDirection: 0,
      conditions: imd?.Todays_Forecast,
    },
    // future: parseIMDFutureItems(imd, future),
    future: parseIMDFutureItems(imd),
  };

  return sanitizedWeatherInfo;
};

export const sanitizeRAJAIWeather = (data: {
  imd: any;
  visualCrossing: VisualCrossingCurrentConditionsObject;
  future: ReadonlyArray<VisualCrossingCurrentConditionsObject>;
}): SanitizedIMDWeather => {
  const { imd, visualCrossing, future } = data;
  // extract fields of relevance from visual crossing.
  const date = new Date(Date.now()).toISOString().split('T')[0];
  console.log('+++++imd+++++++++', imd);
  const sanitizedWeatherInfo: SanitizedIMDWeather = {
    general: {
      station: imd?.Station_Name,
      station_hindi:
        RAJKISAN_DISTRICTS[imd[0]?.district_name?.toLowerCase()].hin,
      station_oria: '',
      date: date,
    },
    current: {
      temp: visualCrossing.temp,
      cloudCover: imd.cloud_cover ? imd.cloud_cover : visualCrossing.cloudcover,
      humidity: imd.humidity
        ? imd.humidity
        : visualCrossing.humidity.toString(), //imd.Relative_Humidity_at_0830,
      windSpeed: imd.wind_speed ? imd.wind_speed : visualCrossing.windspeed,
      windDirection: visualCrossing.winddir,
      conditions: imd?.Todays_Forecast ?? visualCrossing.conditions,
    },
    // future: parseIMDFutureItems(imd, future),
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
  // future: ReadonlyArray<VisualCrossingCurrentConditionsObject>,
): ReadonlyArray<IMDFutureWeatherDetails> => {
  const baseDate =
    station.Date || (station as any).date || new Date().toDateString();
  // comparing baseDate to today's date
  // const compareDate = compareDateToToday(baseDate);
  const items = [];
  // if (compareDate !== 0) {
  //   // use visual crossing
  //   console.log(
  //     'IMD Data outdated hence fetching future data from visual crossing.',
  //   );
  //   future.forEach((item: VisualCrossingCurrentConditionsObject) => {
  //     const conditions = deduceWeatherCondition(item.conditions);
  //     items.push({
  //       date: item.datetime,
  //       conditions,
  //       temp_max: (item as any).tempmax,
  //       temp_min: (item as any).tempmin,
  //     });
  //   });
  // } else {
  for (let dayOffset = 2; dayOffset <= 5; dayOffset++) {
    const dayKeyMax = `Day_${dayOffset}_Max_Temp`;
    const dayKeyMin = `Day_${dayOffset}_Min_temp`;
    const dayKeyForecast = `Day_${dayOffset}_Forecast`;
    const newDate = calculateDate(baseDate, dayOffset - 1);

    // if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
    const conditions = deduceWeatherCondition(station[dayKeyForecast]);
    items.push({
      date: newDate,
      conditions,
      temp_max: station[dayKeyMax],
      temp_min: station[dayKeyMin],
    });
    // } else {
    //   // fall back to Visual Crossing
    //   console.log(
    //     'IMD Data has nulls for future hence fetching future data from visual crossing.',
    //   );
    //   const item = future[dayOffset - 2];
    //   const conditions = deduceWeatherCondition(item.conditions);
    //   items.push({
    //     date: item.datetime,
    //     conditions,
    //     temp_max: (item as any).tempmax,
    //     temp_min: (item as any).tempmin,
    //   });
    // }
  }
  // }

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
  console.log('input date: ', date);
  const dateRegexes = [
    /^\d{2}-\d{2}-\d{4}$/, // dd-mm-yyyy
    /^\d{2}\/\d{2}\/\d{4}$/, // dd/mm/yyyy
    /^\d{4}-\d{2}-\d{2}$/, // yyyy-mm-dd
    /^\d{4}\/\d{2}\/\d{2}$/, // yyyy/mm/dd
  ];

  if (dateRegexes[0].test(date)) {
    const splitDate: string[] = date.split('-');
    return splitDate.reverse().join('-');
  } else if (dateRegexes[1].test(date)) {
    const splitDate: string[] = date.split('/');
    return splitDate.reverse().join('-');
  } else if (dateRegexes[3].test(date)) {
    const splitDate: string[] = date.split('/');
    return splitDate.reverse().join('-');
  }

  return date;
};


export const readMultipleJSONs = async (filePaths: ReadonlyArray<string>) => {
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