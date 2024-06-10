export interface VISTAARWeather {
  date: string;
  location: {
    name: string;
    code: string;
    lat: string;
    lon: string;
  };
  temperature: {
    max: string;
    min: string;
  };
  humidity: string;
  precipitation: string;
  forecast: {
    description: string;
  };
  wind: {
    speed: string;
    direction: string;
  };
  solar: {
    Sunset_time: string;
    Sunrise_time: string;
  };
  lunar: {
    Moonrise_time: string;
    Moonset_time: string;
  };
}

export interface VISTAARAdvisory {
  crop_name: string;
  crop_advisory: string[];
}

export interface VISTAARData {
  weather: VISTAARWeather[];
  advisory: VISTAARAdvisory[];
}