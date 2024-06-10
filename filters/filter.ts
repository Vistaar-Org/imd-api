import { parseISO, isWithinInterval } from 'date-fns';
import { VISTAARData } from '../mapper/models/VISTAAR.model';
import { VISTAAR_SEARCH_FILTER } from './VISTAAR.filter';

export function filterVISTAARData(vistaarData: VISTAARData, filters: VISTAAR_SEARCH_FILTER): VISTAARData {
  const filteredWeather = vistaarData.weather.filter(item => {
    // Filter by station codes and names
    const stationCodeMatch = !filters.station_codes.length || filters.station_codes.includes(item.location.code) || !item.location.code;
    const stationNameMatch = !filters.station_names.length || filters.station_names.includes(item.location.name) || !item.location.name;

    // Filter by latitude and longitude
    const latMatch = !filters.lat || item.location.lat === filters.lat || !item.location.lat;
    const longMatch = !filters.long || item.location.lon === filters.long || !item.location.lon;

    // Filter by date range
    const dateMatch = !filters.start_date || !filters.end_date || isWithinInterval(parseISO(item.date), { start: parseISO(filters.start_date), end: parseISO(filters.end_date) });

    return stationCodeMatch && stationNameMatch && latMatch && longMatch && dateMatch;
  });

  const filteredAdvisory = vistaarData.advisory.filter(item => {
    return !filters.crops.length || filters.crops.includes(item.crop_name);
  });

  return { weather: filteredWeather, advisory: filteredAdvisory };
}