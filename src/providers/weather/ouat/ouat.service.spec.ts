import { Test, TestingModule } from "@nestjs/testing";
import { OUATWeatherService } from "./ouat.service";
import { Logger } from "@nestjs/common";

describe('OUAT Weather Service', () => {
  let service: OUATWeatherService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OUATWeatherService, Logger],
    }).compile();
    service = module.get<OUATWeatherService>(OUATWeatherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return weather data for odisha district', async () => {
    const weather = await service.getWeather('anugul');
    console.log('weather: ', weather);
    expect(weather).toBeDefined();
  });

  it('should return weather data for non-odisha district', async () => {
    const weather = await service.getWeather('bangalore');
    console.log('weather: ', weather);
    expect(weather).toBeDefined();
  });

});
