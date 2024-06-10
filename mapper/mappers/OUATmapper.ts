import { JSONPath } from 'jsonpath-plus';
import { BecknOnSearchResponse, BecknItem, BecknCatalog, BecknMessage, BecknContext } from '../models/onsearch.model'

import { OUATData } from '../models/OUAT.model'


// Function to generate the Beckn on_search API response
function transformOUATDataToBeckn(ouatData: any): any {
  const weatherDetailsPath = '$.weather_details';
  const weatherDetails = JSONPath({ path: weatherDetailsPath, json: ouatData });

  // Map weather details to items with category "weather"
  const weatherItems = Object.entries(weatherDetails[0]).map(([date, details]: [string, any]) => ({
    id: `${date}`,
    tags: [
      {
        descriptor: {
          name: "Category",
          code: "category"
        },
        value: "weather"
      }
    ],
    weather_data: details
  }));

  // Map crops data to items with category "crops"
  const cropItems = ouatData.names_of_crops.map((crop: string) => ({
    id: crop,
    descriptor: {
      name: crop,
      code: crop,
      symbol: "",
      short_desc: `Advisory for ${crop}`,
      long_desc: `Specific advisories for ${crop} based on current weather conditions.`,
      images: []
    },
    tags: [
      {
        descriptor: {
          name: "Category",
          code: "category"
        },
        value: "crops"
      }
    ],
    advisories: JSONPath({ path: `$.crops_data.${crop}.advisory`, json: ouatData })
  }));

  return {
    context: {
      domain: "agriculture",
      country: "IN",
      city: "Bhubaneswar",
      action: "on_search",
      core_version: "1.0.0",
      bap_id: "bap.example.com",
      bap_uri: "https://bap.example.com",
      transaction_id: "1234567890",
      message_id: "abcdefghij",
      timestamp: ouatData.date + 'T12:00:00Z',
      ttl: "PT30M"
    },
    message: {
      catalog: {
        descriptor: {
          name: "Weather and Crop Advisory",
          code: "weather_crop_advisory",
          symbol: "",
          short_desc: "Weather forecast and crop advisory for the coming days",
          long_desc: "Detailed weather forecast and advisory for various crops based on current and past weather conditions.",
          images: [],
          categories: [
            {
              id: "weather",
              descriptor: {
                name: "Weather",
                code: "weather"
              }
            },
            {
              id: "crops",
              descriptor: {
                name: "Crops",
                code: "crops"
              }
            }
          ]
        },
        items: [...weatherItems, ...cropItems]
      }
    }
  };
}