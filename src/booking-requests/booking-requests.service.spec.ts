import { Test, TestingModule } from '@nestjs/testing';

import { BookingRequestsService } from './booking-requests.service';
import { TenantsService } from '../tenants/tenants.service';

describe('BookingRequestsService', () => {
  let service: BookingRequestsService;

  const bookingRequestModelMock = {
    db: {
      collection: jest.fn(),
    },
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn(),
    create: jest.fn(),
  };

  const tenantsServiceMock = {
    findByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          {
            provide: BookingRequestsService,
            useFactory: () =>
              new BookingRequestsService(
                bookingRequestModelMock as any,
                tenantsServiceMock as any,
              ),
          },
        ],
      }).compile();

    service =
      module.get<BookingRequestsService>(
        BookingRequestsService,
      );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});