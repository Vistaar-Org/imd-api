import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable } from 'rxjs';

@Injectable()
export class CentroidInterceptor implements NestInterceptor {
  private readonly httpService: HttpService;
  private readonly logger: Logger;

  constructor() {
    this.httpService = new HttpService();
    this.logger = new Logger(CentroidInterceptor.name);
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // Your interceptor logic here
    this.logger.verbose('this interceptor was called.');
    const request = context.switchToHttp().getRequest();
    // if(request.body) {
    //   const latitude
    // }
    const { latitude, longitude } = request.query;
    if (!latitude || !longitude) {
      return next.handle();
    }
    // call the georev service
    const startTime = performance.now();
    const district = await this.getDistrict(latitude, longitude);
    const endTime = performance.now();
    this.logger.verbose(`Time taken to get district: ${endTime - startTime}`);
    /*
    startTime = performance.now();
    const { lat, lon } = await this.getCentroid(district);
    endTime = performance.now();
    this.logger.verbose(`Time taken to get centroid: ${endTime - startTime}`);
    this.logger.verbose(
      `Updating the received lat: ${latitude} & lon: ${longitude} with the centroid lat: ${lat} & lon: ${lon}`,
    );
    request.query.latitude = lat;
    request.query.longitude = lon;
    */
    // save district in request
    request.body['district'] = district;

    return next.handle();
  }

  private async getDistrict(lat: string, lon: string): Promise<any> {
    try {
      const resp = await this.httpService.axiosRef.get(
        `https://geoip.samagra.io/georev?lat=${lat}&lon=${lon}`,
      );
      return resp.data.district;
    } catch (err) {
      this.logger.error('Error occurred while reading the geoip database', err);
      throw new InternalServerErrorException(
        'Error occurred while reading the geoip database',
      );
    }
  }
}
