import { calculateDate } from './app.utils';

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

export function transformIMDDataToBeckn(imdData) {
  const context = generateContext();

  const items = [];

  imdData.forEach((station) => {
    const baseDate = station.Date;

    // Today's data
    items.push({
      time: { label: baseDate },
      location_id: station.Station_Code,
      tags: {
        rainfall: station.Past_24_hrs_Rainfall,
        t_max: station.Today_Max_temp,
        t_min: station.Today_Min_temp,
        rh_max: station.Relative_Humidity_at_0830,
        rh_min: station.Relative_Humidity_at_1730,
        wind_speed: '', // Not available in IMD data
        wind_direction: '', // Not available in IMD data
        cloud_cover: '', // Not available in IMD data
        Sunset_time: station.Sunset_time,
        Sunrise_time: station.Sunrise_time,
        Moonset_time: station.Moonset_time,
        Moonrise_time: station.Moonrise_time,
        forecast: station.Todays_Forecast,
      },
    });

    // Subsequent days
    for (let dayOffset = 2; dayOffset <= 7; dayOffset++) {
      const dayKeyMax = `Day_${dayOffset}_Max_Temp`;
      const dayKeyMin = `Day_${dayOffset}_Min_temp`;
      const dayKeyForecast = `Day_${dayOffset}_Forecast`;

      if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
        const newDate = calculateDate(baseDate, dayOffset - 1);
        items.push({
          time: { label: newDate },
          location_id: station.Station_Code,
          tags: {
            rainfall: 'NA', // Not available in IMD data
            t_max: station[dayKeyMax],
            t_min: station[dayKeyMin],
            rh_max: 'NA', // Not available in IMD data
            rh_min: 'NA', // Not available in IMD data
            wind_speed: 'NA', // Not available in IMD data
            wind_direction: 'NA', // Not available in IMD data
            cloud_cover: 'NA', // Not available in IMD data
            Sunset_time: station.Sunset_time,
            Sunrise_time: station.Sunrise_time,
            Moonset_time: station.Moonset_time,
            Moonrise_time: station.Moonrise_time,
            forecast: station[dayKeyForecast],
          },
        });
      }
    }
  });

  const catalog = {
    providers: [
      {
        items,
      },
    ],
  };

  const message = {
    catalog,
  };

  return { context, message };
}
