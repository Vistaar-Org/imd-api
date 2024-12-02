import { Test, TestingModule } from "@nestjs/testing";
import { OUATAdvisoryService } from "./ouat.service";
import { Logger } from "@nestjs/common";

describe('OUAT Advisory Service', () => {
  let service: OUATAdvisoryService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OUATAdvisoryService, Logger],
    }).compile();
    service = module.get<OUATAdvisoryService>(OUATAdvisoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return advisory data for odisha district', async () => {
    const advisory = await service.getAdvisory('anugul');
    console.log('advisory: ', advisory);
    expect(advisory).toBeDefined();
    expect(advisory.englishData).toBeDefined();
    expect(advisory.odiaData).toBeDefined();
    expect(advisory.englishData.district).toBe('anugul');
  });

  it('should return advisory data for non-odisha district', async () => {
    const advisory = await service.getAdvisory('bangalore');
    console.log('advisory: ', advisory);
    expect(advisory).toBeDefined();
    expect(advisory.englishData).toBeDefined();
    expect(advisory.odiaData).toBeDefined();
    expect(advisory.englishData.district).toBe('khordha');
  });

});
