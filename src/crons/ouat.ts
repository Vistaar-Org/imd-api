import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ODISHA_DISTRICTS } from '../constants/odisha-districts';

const getOUATData = async (filePath: string) => {
  try {
    console.log(
      `https://chakshugautam.github.io/ouat.ac.in-api/latest/${filePath}.json`,
    );
    const res = await axios.get(
      `https://chakshugautam.github.io/ouat.ac.in-api/latest/${filePath}.json`,
    );
    return { [filePath]: res.data };
  } catch (err) {
    console.error('Error downloading the OUAT data: ', err);
  }
};

const parseResponses = (item) => {
  const asyncFileSystem = fs.promises;
  return item.map((_) => {
    const key = Object.keys(_)[0];
    console.log('key: ', key);
    return asyncFileSystem.writeFile(
      path.join(__dirname, `../data/ouat/${Object.keys(_)[0]}.json`),
      JSON.stringify(_[key], null, 2),
    );
  });
};

(async () => {
  let promises: Promise<any>[] = ODISHA_DISTRICTS.map((_) => getOUATData(_));
  promises.push(...ODISHA_DISTRICTS.map((_) => getOUATData(`odia/${_}`)));
  const results = await Promise.all(promises);
  console.log('results: ', results);
  promises = parseResponses(results);
  await Promise.all(promises);
})();
