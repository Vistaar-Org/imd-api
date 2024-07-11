import {
  CROP_IMAGES,
  WEATHER_DATA,
  calculateWeatherConditions,
  deduceWeatherCondition,
  getParsedDate,
  getWindDirection,
} from './app.utils';
import { format } from 'date-fns';
import {
  IMDFutureWeatherDetails,
  SanitizedIMDWeather,
} from './types/app.types';
import { WEATHER_CATEGORY_IDS } from './constants/enums';
import encode from 'urlencode';

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

const generateTag = (key: any, value: any) => {
  return {
    descriptor: { name: key },
    value: value + '',
  };
};

const processURLs = (url: string) => {
  console.log('rec url: ', url);
  const [domain, resource] = url.split(
    'https://cdn-api.dev.bhasai.samagra.io/vistaar/public/',
  );
  console.log(domain, resource);
  url =
    'https://cdn-api.dev.bhasai.samagra.io/vistaar/public/' + encode(resource);
  console.log('url: ', url);
  return url;
};

export const mapIMDItems = (sanitizedIMDData: SanitizedIMDWeather) => {
  const items = [];
  // generate `current_weather` object
  let conditions = deduceWeatherCondition(sanitizedIMDData.current.conditions);
  items.push({
    descriptor: {
      images: [
        {
          url: processURLs(WEATHER_DATA[conditions].image_day),
          type: 'image_day',
        },
        {
          url: processURLs(WEATHER_DATA[conditions].image_night),
          type: 'image_night',
        },
        {
          url: processURLs(WEATHER_DATA[conditions].icon),
          type: 'icon',
        },
      ],
    },
    time: {
      label: 'Date of Observation',
      timestamp: new Date(sanitizedIMDData.general.date).toISOString(),
    },
    locations_ids: [sanitizedIMDData.general.station],
    category_ids: [WEATHER_CATEGORY_IDS.CURRENT_WEATHER],
    tags: [
      {
        list: [
          generateTag('conditions', conditions),
          generateTag('conditions_hi', WEATHER_DATA[conditions].hi_translated),
          generateTag('conditions_or', WEATHER_DATA[conditions].or_translated),
          generateTag('temp', sanitizedIMDData.current.temp),
          generateTag('humidity', sanitizedIMDData.current.humidity),
          generateTag(
            'winddir',
            getWindDirection(sanitizedIMDData.current.windDirection, 'en'),
          ),
          generateTag(
            'winddir_hi',
            getWindDirection(sanitizedIMDData.current.windDirection, 'hi'),
          ),
          generateTag(
            'winddir_or',
            getWindDirection(sanitizedIMDData.current.windDirection, 'or'),
          ),
          generateTag('windspeed', sanitizedIMDData.current.windSpeed),
          generateTag('cloudcover', sanitizedIMDData.current.cloudCover),
        ],
      },
    ],
  });

  sanitizedIMDData.future.forEach((item: IMDFutureWeatherDetails) => {
    conditions = deduceWeatherCondition(item.conditions);
    items.push({
      descriptor: {
        images: [
          {
            url: processURLs(WEATHER_DATA[conditions].image_day),
            type: 'image_day',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].image_night),
            type: 'image_night',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].icon),
            type: 'icon',
          },
        ],
      },
      time: {
        label: 'Future Date of Forecast',
        timestamp: new Date(item.date).toISOString(),
      },
      location_ids: [sanitizedIMDData.general.station],
      category_ids: [WEATHER_CATEGORY_IDS.FUTURE_WEATHER],
      tags: [
        generateTag('temp_max', item.temp_max),
        generateTag('temp_min', item.temp_min),
        generateTag('conditions_hi', WEATHER_DATA[conditions].hi_translated),
        generateTag('conditions_or', WEATHER_DATA[conditions].or_translated),
        generateTag('conditions', conditions),
      ],
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
  if (upcarData?.general_advisory) {
    items.push({
      category_ids: ['general_advisory'],
      code: 'general',
      descriptor: {
        name: 'General Crop Advisory',
        long_desc: upcarData.general_advisory,
        images: [
          {
            url: CROP_IMAGES['general_advisory']
              ? processURLs(CROP_IMAGES['general_advisory'])
              : processURLs(CROP_IMAGES['wheat']),
          },
        ],
      },
    });
  }
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
              ? processURLs(CROP_IMAGES[key.toLowerCase()])
              : processURLs(CROP_IMAGES['wheat']),
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
            url: processURLs(WEATHER_DATA[conditions].image_day),
            type: 'image_day',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].image_night),
            type: 'image_night',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].icon),
            type: 'icon',
          },
        ],
      },
      time: {
        label: 'Future Date of Forecast',
        timestamp: new Date(format(parsedDate, 'yyyy-MM-dd')).toISOString(),
      },
      location_ids: [ouatWeatherData.district],
      category_ids: ['future_weather'], // TODO: Turn this into an enum
      tags: [
        generateTag('rainfall', station.rainfall),
        generateTag('temp_max', station.t_max),
        generateTag('temp_min', station.t_min),
        generateTag('conditions_hi', WEATHER_DATA[conditions].hi_translated),
        generateTag('conditions_or', WEATHER_DATA[conditions].or_translated),
        generateTag('conditions', conditions),
        generateTag(
          'temp',
          (parseFloat(station.t_max) + parseFloat(station.t_min)) / 2,
        ),
        generateTag('humidity', 'NA'),
        generateTag('winddir', station.wind_direction),
        generateTag('windspeed', station.wind_speed),
        generateTag('rh_max', station.rh_max),
        generateTag('rh_min', station.rh_min),
        generateTag('wind_speed', 'NA'),
        generateTag('wind_direction', 'NA'),
        generateTag('cloud_cover', station.cloud_cover),
      ],
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

/// VISTAAR SUTFF ///

export const mapIMDItemsVistaar = (sanitizedIMDData: SanitizedIMDWeather) => {
  const items = [];
  // generate `current_weather` object
  let conditions = deduceWeatherCondition(sanitizedIMDData.current.conditions);
  items.push({
    descriptor: {
      images: [
        {
          url: processURLs(WEATHER_DATA[conditions].image_day),
          type: 'image_day',
        },
        {
          url: processURLs(WEATHER_DATA[conditions].image_night),
          type: 'image_night',
        },
        {
          url: processURLs(WEATHER_DATA[conditions].icon),
          type: 'icon',
        },
      ],
    },
    time: {
      label: 'Date of Observation',
      timestamp: new Date(sanitizedIMDData.general.date).toISOString(),
    },
    locations_ids: [sanitizedIMDData.general.station],
    category_ids: [WEATHER_CATEGORY_IDS.CURRENT_WEATHER],
    tags: [
      {
        list: [
          generateTag('conditions', conditions),
          generateTag('conditions_hi', WEATHER_DATA[conditions].hi_translated),
          generateTag('conditions_or', WEATHER_DATA[conditions].or_translated),
          generateTag('temp', sanitizedIMDData.current.temp),
          generateTag('humidity', sanitizedIMDData.current.humidity),
          generateTag(
            'winddir',
            getWindDirection(sanitizedIMDData.current.windDirection, 'en'),
          ),
          generateTag(
            'winddir_hi',
            getWindDirection(sanitizedIMDData.current.windDirection, 'hi'),
          ),
          generateTag(
            'winddir_or',
            getWindDirection(sanitizedIMDData.current.windDirection, 'or'),
          ),
          generateTag('windspeed', sanitizedIMDData.current.windSpeed),
          generateTag('cloudcover', sanitizedIMDData.current.cloudCover),
        ],
      },
    ],
  });

  sanitizedIMDData.future.forEach((item: IMDFutureWeatherDetails) => {
    conditions = deduceWeatherCondition(item.conditions);
    items.push({
      descriptor: {
        images: [
          {
            url: processURLs(WEATHER_DATA[conditions].image_day),
            type: 'image_day',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].image_night),
            type: 'image_night',
          },
          {
            url: processURLs(WEATHER_DATA[conditions].icon),
            type: 'icon',
          },
        ],
      },
      time: {
        label: 'Future Date of Forecast',
        timestamp: new Date(item.date).toISOString(),
      },
      location_ids: [sanitizedIMDData.general.station],
      category_ids: [WEATHER_CATEGORY_IDS.FUTURE_WEATHER],
      tags: [
        generateTag('temp_max', item.temp_max),
        generateTag('temp_min', item.temp_min),
        generateTag('conditions_hi', WEATHER_DATA[conditions].hi_translated),
        generateTag('conditions_or', WEATHER_DATA[conditions].or_translated),
        generateTag('conditions', conditions),
      ],
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
