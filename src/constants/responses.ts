export const DUMMY_WEATHER = {
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
  items: [
    {
      descriptor: {
        images: [
          {
            url: 'https://cdn-api.dev.bhasai.samagra.io/vistaar/public/Sunny.svg',
            type: 'image_day',
          },
          {
            url: 'https://cdn-api.dev.bhasai.samagra.io/vistaar/public/Weather card ( Night ).svg',
            type: 'image_night',
          },
          {
            url: 'https://cdn-api.dev.bhasai.samagra.io/vistaar/public/sun.svg',
            type: 'icon',
          },
        ],
      },
      time: {
        label: 'Date of Observation',
      },
      locations_ids: ['NA'],
      category_ids: ['current_weather'],
      tags: {
        conditions: 'NA',
        conditions_hi: 'NA',
        conditions_or: 'NA',
        temp: '--',
        humidity: '--',
        winddir: 'NA',
        winddir_hi: 'NA',
        winddir_or: 'NA',
        windspeed: '--',
        cloudcover: '--',
      },
    },
  ],
};
