import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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

  // ==========================================
  // ADMIN / PROPERTY MANAGER DASHBOARD
  // ==========================================

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
            total: {
              $sum: '$amount',
            },
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

  // ==========================================
  // TENANT DASHBOARD
  // ==========================================

  async getTenantDashboard(email: string) {
    if (!email) {
      throw new NotFoundException(
        'Logged-in user email was not found.',
      );
    }

    // Find tenant using logged-in user's email
    const tenant = await this.tenantModel
      .findOne({
        email: email.toLowerCase(),
      })
      .lean();

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found for this account.',
      );
    }

    // Find tenant's leases
    const leases = await this.leaseModel
      .find({
        tenant: tenant._id,
      })
      .populate({
        path: 'unit',
        populate: {
          path: 'property',
        },
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    // Active lease
    const activeLease =
      leases.find(
        (lease) =>
          lease.status === 'active',
      ) ?? null;

    // Tenant payments
    //
    // IMPORTANT:
    // This assumes your Payment schema has a
    // `lease` field, which your existing rental
    // project already uses.
    const payments = activeLease
      ? await this.paymentModel
          .find({
            lease: activeLease._id,
          })
          .sort({
            paymentDate: -1,
            createdAt: -1,
          })
          .limit(10)
          .lean()
      : [];

    // Total amount paid for this tenant's leases
    const leaseIds = leases.map(
      (lease) => lease._id,
    );

    const paymentStats =
      leaseIds.length > 0
        ? await this.paymentModel.aggregate([
            {
              $match: {
                lease: {
                  $in: leaseIds,
                },
                status: 'completed',
              },
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: '$amount',
                },
              },
            },
          ])
        : [];

    const totalPaid =
      paymentStats[0]?.total ?? 0;

    // Format active lease information
    let leaseData = null;

    if (activeLease) {
      const unit =
        activeLease.unit as any;

      const property =
        unit?.property as any;

      leaseData = {
        id: activeLease._id,

        startDate:
          activeLease.startDate,

        endDate:
          activeLease.endDate,

        monthlyRent:
          activeLease.monthlyRent,

        securityDeposit:
          activeLease.securityDeposit,

        status:
          activeLease.status,

        unit: unit
          ? {
              id: unit._id,
              unitNumber:
                unit.unitNumber,
              floor:
                unit.floor,
              bedrooms:
                unit.bedrooms,
            }
          : null,

        property: property
          ? {
              id: property._id,
              name:
                property.name,
              address:
                property.address,
              city:
                property.city,
            }
          : null,
      };
    }

    // Recent payment information
    const recentPayments =
      payments.map(
        (payment: any) => ({
          id: payment._id,
          amount:
            payment.amount,
          status:
            payment.status,
          paymentDate:
            payment.paymentDate ??
            payment.createdAt,
          reference:
            payment.reference ??
            payment.transactionId ??
            null,
        }),
      );

    return {
      tenant: {
        id: tenant._id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        emergencyContact:
          tenant.emergencyContact,
      },

      lease: leaseData,

      statistics: {
        activeLeases:
          leases.filter(
            (lease) =>
              lease.status ===
              'active',
          ).length,

        totalLeases:
          leases.length,

        totalPaid,
      },

      payments:
        recentPayments,
    };
  }
}