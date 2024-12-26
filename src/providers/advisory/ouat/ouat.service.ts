import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CROP_MAPPINGS, readMultipleJSONs } from '../../../app.utils';
import { OUAT_ORIA_DISTRICTS } from '../../../app.constants';
import { ODISHA_DISTRICTS } from '../../../constants/odisha-districts';
import * as fs from 'fs';
import * as path from 'path';
import { MinIOService } from './../../../minio/minio.service';
import { mapAdvisoryData } from './../../../beckn.utils';

@Injectable()
export class OUATAdvisoryService {
  constructor(
    private readonly logger: Logger,
    private readonly minioService: MinIOService,
  ) {}

  private async fetchAdvisoryDataFromOUAT(district: string) {
    district = !ODISHA_DISTRICTS.includes(district.toLowerCase())
      ? 'khordha'
      : district.toLowerCase();

    // fetching data from OUAT
    const startTime = performance.now();
    const filePaths = [`ouat/${district}.json`, `ouat/odia/${district}.json`];
    const [englishData, odiaData]: any[] = await readMultipleJSONs(filePaths);
    const endTime = performance.now();
    this.logger.verbose(
      `Time taken to read OUAT data JSON: ${endTime - startTime}`,
    );
    delete englishData['weather_details'];
    delete odiaData['weather_details'];
    englishData['district'] = district;
    odiaData['district'] = OUAT_ORIA_DISTRICTS[district];
    return { englishData, odiaData };
  }

  /**
   * Fetches advisory data from OUAT
   * @returns advisory data
   */
  async getAdvisory(district: string) {
    try {
      const { englishData, odiaData } =
        await this.fetchAdvisoryDataFromOUAT(district);
      const ouatItems = mapAdvisoryData(englishData, 'ouat');
      const upcarOdiaProvider = mapAdvisoryData(odiaData, 'ouat');
      const odiaItems = upcarOdiaProvider.items.map((item) => {
        if (CROP_MAPPINGS[item.code]) {
          item.descriptor.name = CROP_MAPPINGS[item.code].hi;
        }
        item.category_ids.push('or_translated');
        return item;
      });
      ouatItems.items.push(...odiaItems);
      ouatItems.categories.push({
        id: 'or_translated',
      });
      return ouatItems;
    } catch (err) {
      this.logger.error('Error fetching advisory data from OUAT', err);
    }
  }

  async updateAdvisory(data: any, district: string, lang: string) {
    // TODO: Integrate MinIO to upload and save advisory data
    // TODO: Use update functions to update advisory data
    let folderPath = '';
    if (lang === 'or') {
      folderPath = path.join(
        __dirname,
        `../../../data/ouat/odia/${district}.json`,
      );
    } else {
      folderPath = path.join(__dirname, `../../../data/ouat/${district}.json`);
    }
    this.logger.log(folderPath);
    if (!fs.existsSync(folderPath)) {
      this.logger.error(`File ${folderPath} does not exist`);
      throw new InternalServerErrorException(
        `File ${folderPath} does not exist`,
      );
    }
    fs.writeFileSync(folderPath, JSON.stringify(data, null, 2));
    this.minioService.uploadFile(
      'vistaar',
      `ouat/${lang == 'or' ? 'odia/' : ''}${folderPath.split('/').pop()}`,
      Buffer.from(JSON.stringify(data, null, 2)),
      'application/json',
    );
    return { message: 'Advisory updated successfully' };
  }
}
