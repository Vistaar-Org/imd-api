import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const getUPCARData = async (filePath: string) => {
  try {
    const res = await axios.get(
      `https://bharatsahaiyak.github.io/upcar-advisory/${filePath}`,
    );

    return { [filePath]: res.data };
  } catch (err) {
    console.error('Error getting UPCAR Data: ', err);
  }
};

const parseResponses = (item) => {
  const asyncFileSystem = fs.promises;
  return item.map((_) => {
    const key = Object.keys(_)[0];
    console.log('key: ', key);
    return asyncFileSystem.writeFile(
      path.join(__dirname, `../data/upcar/${Object.keys(_)[0]}`),
      JSON.stringify(_[key], null, 2),
    );
  });
};

(async () => {
  const files = ['latest.json', 'latest_hindi.json'];
  let promises: Promise<any>[] = files.map((_) => getUPCARData(_));
  const results = await Promise.all(promises);
  console.log('results: ', results);
  promises = parseResponses(results);
  await Promise.all(promises);
})();
