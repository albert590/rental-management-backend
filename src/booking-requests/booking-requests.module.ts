import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BookingRequestsController } from './booking-requests.controller';
import { BookingRequestsService } from './booking-requests.service';

import {
  BookingRequest,
  BookingRequestSchema,
} from './schemas/booking-request.schema';

import {
  Lease,
  LeaseSchema,
} from '../leases/schemas/lease.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: BookingRequest.name,
        schema: BookingRequestSchema,
      },
      {
        name: Lease.name,
        schema: LeaseSchema,
      },
    ]),
  ],

  controllers: [
    BookingRequestsController,
  ],

  providers: [
    BookingRequestsService,
  ],

  exports: [
    BookingRequestsService,
  ],
})
export class BookingRequestsModule {}