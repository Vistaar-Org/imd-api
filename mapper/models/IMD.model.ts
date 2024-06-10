export interface IMDData {
    Date: string;
    Station_Code: string;
    Station_Name: string;
    Today_Max_temp: string;
    Today_Min_temp: string;
    Past_24_hrs_Rainfall: string;
    Relative_Humidity_at_0830: string;
    Relative_Humidity_at_1730: string;
    Sunset_time: string;
    Sunrise_time: string;
    Moonset_time: string;
    Moonrise_time: string;
    Todays_Forecast_Max_Temp?: string;
    Todays_Forecast_Min_temp?: string;
    Todays_Forecast?: string;
    [key: string]: any; // for Day_X fields
  }