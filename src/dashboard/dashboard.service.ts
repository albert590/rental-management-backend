import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Property,
  PropertyDocument,
} from '../properties/schemas/property.schema';

import {
  Unit,
  UnitDocument,
} from '../units/schemas/unit.schema';

import {
  Tenant,
  TenantDocument,
} from '../tenants/schemas/tenant.schema';

import {
  Lease,
  LeaseDocument,
} from '../leases/schemas/lease.schema';

import {
  Payment,
  PaymentDocument,
} from '../payments/schemas/payment.schema';

import {
  Maintenance,
  MaintenanceDocument,
} from '../maintenance/schemas/maintenance.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,

    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocument>,

    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,

    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocument>,

    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,

    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
  ) {}

  async getStats() {
    const [
      properties,
      units,
      tenants,
      activeLeases,
      availableUnits,
      occupiedUnits,
      pendingMaintenance,
      paymentStats,
    ] = await Promise.all([
      this.propertyModel.countDocuments(),

      this.unitModel.countDocuments(),

      this.tenantModel.countDocuments(),

      this.leaseModel.countDocuments({
        status: 'active',
      }),

      this.unitModel.countDocuments({
        status: 'available',
      }),

      this.unitModel.countDocuments({
        status: 'occupied',
      }),

      this.maintenanceModel.countDocuments({
        status: 'pending',
      }),

      this.paymentModel.aggregate([
        {
          $match: {
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalRevenue = paymentStats[0]?.total ?? 0;

    return {
      properties,
      units,
      availableUnits,
      occupiedUnits,
      tenants,
      activeLeases,
      totalRevenue,
      pendingMaintenance,
    };
  }
}