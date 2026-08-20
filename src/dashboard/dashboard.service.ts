import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

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

    const totalRevenue =
      paymentStats[0]?.total ?? 0;

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

  async getTenantDashboard(user: any) {
    const userId =
      user?.id ||
      user?._id ||
      user?.userId;

    if (!userId) {
      throw new NotFoundException(
        'Authenticated user ID not found',
      );
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(
        'Invalid authenticated user ID',
      );
    }

    const tenant = await this.tenantModel
      .findOne({
        email: user.email?.toLowerCase().trim(),
      })
      .select('-__v')
      .lean();

    if (!tenant) {
      return {
        tenant: null,
        lease: null,
        unit: null,
        property: null,
        payments: [],
        summary: {
          monthlyRent: 0,
          securityDeposit: 0,
          totalPaid: 0,
          leaseStatus: null,
        },
      };
    }

    const lease = await this.leaseModel
      .findOne({
        tenant: tenant._id,
      })
      .sort({ createdAt: -1 })
      .lean();

    if (!lease) {
      return {
        tenant,
        lease: null,
        unit: null,
        property: null,
        payments: [],
        summary: {
          monthlyRent: 0,
          securityDeposit: 0,
          totalPaid: 0,
          leaseStatus: null,
        },
      };
    }

    const unit = await this.unitModel
      .findById(lease.unit)
      .lean();

    let property = null;

    if (unit?.property) {
      property = await this.propertyModel
        .findById(unit.property)
        .lean();
    }

    const payments = await this.paymentModel
      .find({
        lease: lease._id,
      })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const totalPaid = payments
      .filter(
        (payment: any) =>
          payment.status === 'completed',
      )
      .reduce(
        (total: number, payment: any) =>
          total + Number(payment.amount || 0),
        0,
      );

    return {
      tenant,
      lease,
      unit,
      property,
      payments,
      summary: {
        monthlyRent: lease.monthlyRent ?? 0,
        securityDeposit:
          lease.securityDeposit ?? 0,
        totalPaid,
        leaseStatus: lease.status ?? null,
      },
    };
  }
}