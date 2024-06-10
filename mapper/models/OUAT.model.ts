export interface OUATData {
  weather_details: Record<string, {
    rainfall: number;
    t_max: number;
    t_min: number;
    rh_max: number;
    rh_min: number;
    wind_speed: number;
    wind_direction: number;
    cloud_cover: number;
  }>;
  names_of_crops: string[];
  general_advisory: string;
  crops_data: Record<string, {
    advisory: string[];
  }>;
  date: string;
}