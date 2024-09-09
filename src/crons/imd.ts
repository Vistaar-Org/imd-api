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
  try {
    // fetch IMD weather forecast
    const url = `https://provider-reverse-proxy.uat.bhasai.samagra.io/imd/cityweather.php`;
    const response = await axios.get(url);
    // parse respone and convert array to object
    const parsedData = parseData(response.data);
    // save latest file
    console.log(__dirname);
    fs.writeFileSync(
      path.join(__dirname, '../data/imd/imd.json'),
      JSON.stringify(parsedData, null, 2),
    );
  } catch (err) {
    console.error('Error while fetching and updating IMD data', err);
  }
})();
