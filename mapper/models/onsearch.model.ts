export interface BecknContext {
    domain: string;
    country: string;
    city: string;
    action: string;
    core_version: string;
    bap_id: string;
    bap_uri: string;
    bpp_id: string;
    bpp_uri: string;
    transaction_id: string;
    message_id: string;
    timestamp: string;
    key: string;
    ttl: string;
  }
  
  export interface BecknItem {
    time: {
      label: string;
    };
    location_id: string;
    tags: {
      rainfall: number | string;
      t_max: number | string;
      t_min: number | string;
      rh_max: number | string;
      rh_min: number | string;
      wind_speed: number | string;
      wind_direction: number | string;
      cloud_cover: number | string;
      Sunset_time: string;
      Sunrise_time: string;
      Moonset_time: string;
      Moonrise_time: string;
      forecast: string;
    };
  }
  
  export interface BecknProvider {
    items: BecknItem[];
  }
  
 export  interface BecknCatalog {
    providers: BecknProvider[];
    categories?: { descriptor: { name: string; long_desc: string } }[];
    tags?: { general_advisory: string; date: string };
  }
  
export interface BecknMessage {
    catalog: BecknCatalog;
  }
  
 export interface BecknOnSearchResponse {
    context: BecknContext;
    message: BecknMessage;
  }