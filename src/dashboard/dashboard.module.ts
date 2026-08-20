import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import {
  Property,
  PropertySchema,
} from '../properties/schemas/property.schema';

import {
  Unit,
  UnitSchema,
} from '../units/schemas/unit.schema';

import {
  Tenant,
  TenantSchema,
} from '../tenants/schemas/tenant.schema';

import {
  Lease,
  LeaseSchema,
} from '../leases/schemas/lease.schema';

import {
  Payment,
  PaymentSchema,
} from '../payments/schemas/payment.schema';

import {
  Maintenance,
  MaintenanceSchema,
} from '../maintenance/schemas/maintenance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Property.name,
        schema: PropertySchema,
      },
      {
        name: Unit.name,
        schema: UnitSchema,
      },
      {
        name: Tenant.name,
        schema: TenantSchema,
      },
      {
        name: Lease.name,
        schema: LeaseSchema,
      },
      {
        name: Payment.name,
        schema: PaymentSchema,
      },
      {
        name: Maintenance.name,
        schema: MaintenanceSchema,
      },
    ]),
  ],

  controllers: [
    DashboardController,
  ],

  providers: [
    DashboardService,
  ],
})
export class DashboardModule {}