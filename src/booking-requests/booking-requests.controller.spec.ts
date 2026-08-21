import { Test, TestingModule } from '@nestjs/testing';
import { BookingRequestsController } from './booking-requests.controller';

describe('BookingRequestsController', () => {
  let controller: BookingRequestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingRequestsController],
    }).compile();

    controller = module.get<BookingRequestsController>(BookingRequestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
