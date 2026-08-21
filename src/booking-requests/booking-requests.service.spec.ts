import { Test, TestingModule } from '@nestjs/testing';
import { BookingRequestsService } from './booking-requests.service';

describe('BookingRequestsService', () => {
  let service: BookingRequestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookingRequestsService],
    }).compile();

    service = module.get<BookingRequestsService>(BookingRequestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
