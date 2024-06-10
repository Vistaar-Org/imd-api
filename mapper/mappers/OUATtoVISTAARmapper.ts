import { OUATData } from "../models/OUAT.model";
import { VISTAARAdvisory, VISTAARData, VISTAARWeather } from "../models/VISTAAR.model";

  export function transformOUATDataToVISTAAR(ouatData: OUATData): VISTAARData {
    const weather: VISTAARWeather[] = [];
    const advisory: VISTAARAdvisory[] = [];
  
    // Weather details
    for (const [date, details] of Object.entries(ouatData.weather_details)) {
      weather.push({
        date,
        location: {
          name: "",
          code: "",
          lat: "",
          lon: "",
        },
        temperature: {
          max: details.t_max.toString(),
          min: details.t_min.toString(),
        },
        humidity: `${details.rh_max}, ${details.rh_min}`,
        precipitation: details.rainfall.toString(),
        forecast: {
          description: ""
        },
        wind: {
          speed: details.wind_speed.toString(),
          direction: details.wind_direction.toString()
        },
        solar: {
          Sunset_time: "",
          Sunrise_time: "",
        },
        lunar: {
          Moonrise_time: "",
          Moonset_time: "",
        }
      });
    }
  
    // Advisory details
    for (const [crop_name, data] of Object.entries(ouatData.crops_data)) {
      advisory.push({
        crop_name,
        crop_advisory: data.advisory,
      });
    }
  
    return { weather, advisory };
  }
  