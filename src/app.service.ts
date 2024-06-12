import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getWeather(latitude: string, longitude: string) {
    return;
  }
}
