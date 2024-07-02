import {
  CROP_IMAGES,
  WEATHER_DATA,
  calculateWeatherConditions,
  deduceWeatherCondition,
  getParsedDate,
  getWindDirection,
} from './app.utils';
import { format, parse } from 'date-fns';
import {
  IMDFutureWeatherDetails,
  SanitizedIMDWeather,
} from './types/app.types';
import { WEATHER_CATEGORY_IDS } from './constants/enums';

export const generateContext = () => {
  return {
    domain: 'string',
    country: 'string',
    city: 'string',
    action: 'search',
    core_version: 'string',
    bap_id: 'string',
    bap_uri: 'string',
    bpp_id: 'string',
    bpp_uri: 'string',
    transaction_id: 'string',
    message_id: 'string',
    timestamp: new Date().toISOString(),
    key: 'string',
    ttl: 'string',
  };
};

export const mapIMDItems = (sanitizedIMDData: SanitizedIMDWeather) => {
  const items = [];
  // generate `current_weather` object
  let conditions = deduceWeatherCondition(sanitizedIMDData.current.conditions);
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
      time: {
        label: 'Date of Observation',
        timestamp: sanitizedIMDData.general.date,
      },
      locations_ids: [sanitizedIMDData.general.station],
      category_ids: [WEATHER_CATEGORY_IDS.CURRENT_WEATHER],
      tags: {
        conditions: conditions,
        conditions_hi: WEATHER_DATA[conditions].hi_translated,
        conditions_or: WEATHER_DATA[conditions].or_translated,
        temp: sanitizedIMDData.current.temp,
        humidity: sanitizedIMDData.current.humidity,
        winddir: getWindDirection(sanitizedIMDData.current.windDirection, 'en'),
        winddir_hi: getWindDirection(
          sanitizedIMDData.current.windDirection,
          'hi',
        ),
        winddir_or: getWindDirection(
          sanitizedIMDData.current.windDirection,
          'or',
        ),
        windspeed: sanitizedIMDData.current.windSpeed,
        cloudcover: sanitizedIMDData.current.cloudCover,
      },
    },
  });

  sanitizedIMDData.future.forEach((item: IMDFutureWeatherDetails) => {
    conditions = deduceWeatherCondition(item.conditions);
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
      time: { label: 'Future Date of Forecast', timestamp: item.date },
      location_ids: [sanitizedIMDData.general.station],
      category_ids: [WEATHER_CATEGORY_IDS.FUTURE_WEATHER],
      tags: {
        temp_max: item.temp_max,
        temp_min: item.temp_min,
        conditions_hi: WEATHER_DATA[conditions].hi_translated,
        conditions_or: WEATHER_DATA[conditions].or_translated,
        conditions: conditions, // Not available in IMD data
      },
    });
  });

  return {
    id: 'imd',
    category_id: 'weather_provider',
    categories: [
      {
        id: 'current_weather',
      },
      {
        id: 'future_weather',
      },
    ],
    items,
  };
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
      images: [
        {
          url: CROP_IMAGES['general_advisory']
            ? CROP_IMAGES['general_advisory']
            : CROP_IMAGES['wheat'],
        },
      ],
    },
  });
  // map crop specific stuff
  Object.keys(upcarData.crops_data).forEach((key) => {
    items.push({
      category_ids: ['crop_specific_advisory'],
      code: key,
      descriptor: {
        name: key,
        long_desc: upcarData.crops_data[key].advisory.join('\n'),
        images: [
          {
            url: CROP_IMAGES[key.toLowerCase()]
              ? CROP_IMAGES[key.toLowerCase()]
              : CROP_IMAGES['wheat'],
          },
        ],
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
    const parsedDate = getParsedDate(date);
    const cloudCover = parseFloat(station.cloud_cover);
    const rainfall = parseFloat(station.rainfall);
    const conditions = calculateWeatherConditions(cloudCover, 0, rainfall);

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
        timestamp: format(parsedDate, 'yyyy-MM-dd'),
      },
      location_ids: [ouatWeatherData.district],
      category_ids: ['future_weather'], // TODO: Turn this into an enum
      tags: {
        rainfall: station.rainfall,
        temp_max: station.t_max,
        temp_min: station.t_min,
        conditions_hi: WEATHER_DATA[conditions].hi_translated,
        conditions_or: WEATHER_DATA[conditions].or_translated,
        conditions: conditions, // Not available in OUAT data
        temp: (parseFloat(station.t_max) + parseFloat(station.t_min)) / 2, // Not available in OUAT data
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
