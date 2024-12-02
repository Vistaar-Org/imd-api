import { Test, TestingModule } from '@nestjs/testing';
import { IMDWeatherService } from './imd.service';
import { DUMMY_WEATHER } from '../../../constants/responses';
import { Logger } from '@nestjs/common';

describe('IMD Weather Service', () => {
  let service: IMDWeatherService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IMDWeatherService, Logger],
    }).compile();
    service = module.get<IMDWeatherService>(IMDWeatherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  it('should return dummy weather if IMD data is not found', async () => {
    const weather = await service.getWeather('12.9716', '77.5946');
    console.log('weather: ', weather);
    // TODO: Verify the structure of the response as well or add mock data
    expect(weather).toBeDefined();
  });
});