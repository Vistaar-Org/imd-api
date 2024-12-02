import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { UPCARAdvisoryService } from './upcar.service';

describe('UPCAR Advisory Service', () => {
  let service: UPCARAdvisoryService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UPCARAdvisoryService, Logger],
    }).compile();
    service = module.get<UPCARAdvisoryService>(UPCARAdvisoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  it('should return advisory data', async () => {
    const advisory = await service.getAdvisory();
    console.log('advisory: ', advisory);
    // TODO: Verify the structure of the response as well or add mock data
    expect(advisory).toBeDefined();
  });
}); 