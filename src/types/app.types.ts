export type SanitizedIMDWeather = {
  general: {
    station: string;
    station_hindi: string;
    station_oria: string;
    date: string;
  };
  current: IMDCurrentDayWeatherDetails;
  future?: ReadonlyArray<IMDFutureWeatherDetails>;
};

export type IMDCurrentDayWeatherDetails = {
  temp: number;
  cloudCover: number;
  humidity: string;
  windSpeed: number;
  windDirection: number;
  conditions: string;
};

export type IMDFutureWeatherDetails = {
  date: string;
  conditions: string;
  temp_max: number;
  temp_min: number;
};
