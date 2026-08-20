import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TenantsModule } from '../tenants/tenants.module';

import { LeasesController } from './leases.controller';
import { LeasesService } from './leases.service';
import { Lease, LeaseSchema } from './schemas/lease.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Lease.name,
        schema: LeaseSchema,
      },
    ]),
    TenantsModule,
  ],
  controllers: [LeasesController],
  providers: [LeasesService],
  exports: [LeasesService],
})
export class LeasesModule {}