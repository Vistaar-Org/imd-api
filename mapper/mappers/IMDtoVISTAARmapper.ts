import { format, addDays } from 'date-fns';
import { IMDData } from '../models/IMD.model';
import { VISTAARAdvisory, VISTAARData, VISTAARWeather } from '../models/VISTAAR.model';

function calculateDate(baseDate: string, daysToAdd: number): string {
  const date = new Date(baseDate);
  const newDate = addDays(date, daysToAdd);
  return format(newDate, 'yyyy-MM-dd');
}

export function transformIMDDataToVISTAAR(imdData: IMDData[]): VISTAARData {
  const weather: VISTAARWeather[] = [];
  const advisory: VISTAARAdvisory[] = []; // Empty for IMD data

  imdData.forEach(station => {
    const baseDate = station.Date;

    // Today's data
    weather.push({
      date: baseDate,
      location: {
        name: station.Station_Name,
        code: station.Station_Code,
        lat: station.Latitude,
        lon: station.Longitude,
      },
      temperature: {
        max: station.Today_Max_temp,
        min: station.Today_Min_temp,
      },
      humidity: `${station.Relative_Humidity_at_0830}, ${station.Relative_Humidity_at_1730}`,
      precipitation: station.Past_24_hrs_Rainfall,
      forecast: {
        description: station.Todays_Forecast
      },
      wind: {
        speed: '',
        direction: ''
      },
      solar: {
        Sunset_time: station.Sunset_time,
        Sunrise_time: station.Sunrise_time,
      },
      lunar: {
        Moonrise_time: station.Moonrise_time,
        Moonset_time: station.Moonset_time,
      }
    });

    // Subsequent days
    for (let dayOffset = 2; dayOffset <= 7; dayOffset++) {
      const dayKeyMax = `Day_${dayOffset}_Max_Temp`;
      const dayKeyMin = `Day_${dayOffset}_Min_temp`;
      const dayKeyForecast = `Day_${dayOffset}_Forecast`;

      if (station[dayKeyMax] && station[dayKeyMin] && station[dayKeyForecast]) {
        const newDate = calculateDate(baseDate, dayOffset - 1);
        weather.push({
          date: newDate,
          location: {
            name: station.Station_Name,
            code: station.Station_Code,
            lat: station.Latitude,
            lon: station.Longitude,
          },
          temperature: {
            max: station[dayKeyMax],
            min: station[dayKeyMin],
          },
          humidity: '',
          precipitation: '',
          forecast: {
            description: station[dayKeyForecast]
          },
          wind: {
            speed: '',
            direction: ''
          },
          solar: {
            Sunset_time: station.Sunset_time,
            Sunrise_time: station.Sunrise_time,
          },
          lunar: {
            Moonrise_time: station.Moonrise_time,
            Moonset_time: station.Moonset_time,
          }
        });
      }
    }
  });

  return { weather, advisory };
}