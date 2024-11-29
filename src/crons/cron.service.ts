import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import * as fs from 'fs';
import * as path from 'path';
import { ODISHA_DISTRICTS } from "src/constants/odisha-districts";

@Injectable()
export class CronService {
  constructor(private readonly logger: Logger, private readonly httpService: HttpService) {}

  private parseIMDData(data) {
    const parsedWeatherReport = {};
    data.forEach((item) => {
      parsedWeatherReport[item.Station_Code] = item;
    });

    return parsedWeatherReport;
  }

  @Cron(CronExpression.EVERY_4_HOURS, {
    name: 'imd-data'
  })
  async updateIMDData() {
    this.logger.verbose('Updating IMD data');
    try {
      // fetch IMD weather forecast
      const url = `https://provider-reverse-proxy.uat.bhasai.samagra.io/imd/cityweather.php`;
      const response = await this.httpService.axiosRef.get(url);
      // parse respone and convert array to object
      const parsedData = this.parseIMDData(response.data);
      // save latest file
      fs.writeFileSync(
        path.join(__dirname, '../data/imd/imd.json'),
        JSON.stringify(parsedData, null, 2),
      );
    } catch (err) {
      this.logger.error('Error while fetching and updating IMD data', err);
    }
    this.logger.verbose('IMD data updated successfully');
  }

  private parseOUATResponses(item) {
    const asyncFileSystem = fs.promises;
    return item.map((_) => {
      const key = Object.keys(_)[0];
      return asyncFileSystem.writeFile(
        path.join(__dirname, `../data/ouat/${Object.keys(_)[0]}.json`),
        JSON.stringify(_[key], null, 2),
      );
    });
  };

  async getOUATData(filePath: string) {
    this.logger.verbose(`Fetching OUAT data for ${filePath}`);
    try {
      const res = await this.httpService.axiosRef.get(
        `https://chakshugautam.github.io/ouat.ac.in-api/latest/${filePath}.json`,
      );
      return { [filePath]: res.data };
    } catch (err) {
      this.logger.error(`Error downloading the OUAT data for ${filePath}: `, err);
    }
  };

  @Cron(CronExpression.EVERY_DAY_AT_11PM, {
    name: 'ouat-data'
  })
  async updateOUATData() {
    this.logger.verbose('Updating OUAT data');
    try {
      let promises: Promise<any>[] = ODISHA_DISTRICTS.map((_) => this.getOUATData(_));
      promises.push(...ODISHA_DISTRICTS.map((_) => this.getOUATData(`odia/${_}`)));
      const results = await Promise.all(promises);
      promises = this.parseOUATResponses(results);
      await Promise.all(promises);
      this.logger.verbose('OUAT data updated successfully');
    } catch (err) {
      this.logger.error('Error while updating OUAT data: ', err);
    }
  }

  private parseUPCARResponses(item) {
    const asyncFileSystem = fs.promises;
    return item.map((_) => {
      const key = Object.keys(_)[0];
      return asyncFileSystem.writeFile(
        path.join(__dirname, `../data/upcar/${Object.keys(_)[0]}`),
        JSON.stringify(_[key], null, 2),
      );
    });
  }

  async getUPCARData(filePath: string) {
    this.logger.verbose(`Fetching UPCAR data for ${filePath}`);
    try {
      const res = await this.httpService.axiosRef.get(
        `https://bharatsahaiyak.github.io/upcar-advisory/${filePath}`,
      );

      return { [filePath]: res.data };
    } catch (err) {
      this.logger.error('Error getting UPCAR Data: ', err);
    }
  };

  @Cron(CronExpression.EVERY_DAY_AT_11PM, {
    name: 'upcar-data'
  })
  async updateUPCARData() {
    this.logger.verbose('Updating UPCAR data');
    try {
      const files = ['latest.json', 'latest_hindi.json'];
      let promises: Promise<any>[] = files.map((_) => this.getUPCARData(_));
      const results = await Promise.all(promises);
      promises = this.parseUPCARResponses(results);
      await Promise.all(promises);
      this.logger.verbose('UPCAR data updated successfully');
    } catch (err) {
      this.logger.error('Error while updating UPCAR data: ', err);
    }
  }
}
