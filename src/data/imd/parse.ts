import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const parseData = (data) => {
  const parsedWeatherReport = {};
  data.forEach((item) => {
    parsedWeatherReport[item.Station_Code] = item;
  });

  return parsedWeatherReport;
};

(async () => {
  // fetch IMD weather forecast
  try {
    const url = `https://city-imd-gov.uat.bhasai.samagra.io/api/cityweather_loc.php`;
    const response = await axios.get(url);
    // parse respone and convert array to object
    const parsedData = parseData(response.data);
    // save latest file
    fs.writeFileSync(
      path.join(__dirname, '/imd.json'),
      JSON.stringify(parsedData, null, 2),
    );
  } catch (err) {
    console.error('Error while fetching and updating IMD data', err);
  }
})();
