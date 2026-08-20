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

  // =========================
  // ADMIN DASHBOARD
  // =========================

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

  // =========================
  // TENANT DASHBOARD
  // =========================

  async getTenantDashboard(user: any) {
    /*
     * The tenant dashboard MUST use the currently
     * authenticated user's email.
     *
     * We do NOT select an arbitrary tenant.
     */

    const authenticatedEmail =
      typeof user?.email === 'string'
        ? user.email.toLowerCase().trim()
        : '';

    if (!authenticatedEmail) {
      throw new NotFoundException(
        'Authenticated user email not found',
      );
    }

    /*
     * Find ONLY the tenant whose email matches
     * the authenticated account.
     */
    const tenant = await this.tenantModel
      .findOne({
        email: authenticatedEmail,
      })
      .select('-__v')
      .lean();

    /*
     * It is valid for a newly registered user to
     * have a User account but no Tenant record yet.
     *
     * Return an empty tenant dashboard instead
     * of returning another person's data.
     */
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
        statistics: {
          activeLeases: 0,
          totalLeases: 0,
          totalPaid: 0,
        },
      };
    }

    /*
     * Find leases belonging ONLY to this tenant.
     */
    const leases = await this.leaseModel
      .find({
        tenant: tenant._id,
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    /*
     * No lease for this tenant.
     */
    if (!leases.length) {
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
        statistics: {
          activeLeases: 0,
          totalLeases: 0,
          totalPaid: 0,
        },
      };
    }

    /*
     * Prefer the active lease.
     * If there is no active lease, use the
     * most recent lease.
     */
    const activeLease =
      leases.find(
        (item: any) =>
          item.status?.toLowerCase() === 'active',
      ) ?? leases[0];

    /*
     * Find ONLY the unit belonging to the selected
     * tenant lease.
     */
    let unit = null;

    if (activeLease.unit) {
      unit = await this.unitModel
        .findById(activeLease.unit)
        .lean();
    }

    /*
     * Find ONLY the property belonging to that unit.
     */
    let property = null;

    if (unit?.property) {
      property = await this.propertyModel
        .findById(unit.property)
        .lean();
    }

    /*
     * Find payments ONLY for this tenant's leases.
     *
     * This is important:
     * We do NOT fetch all payments.
     */
    const leaseIds = leases.map(
      (item: any) => item._id,
    );

    const payments = await this.paymentModel
      .find({
        lease: {
          $in: leaseIds,
        },
      })
      .sort({
        paymentDate: -1,
        createdAt: -1,
      })
      .lean();

    /*
     * Calculate total paid ONLY from this tenant's
     * payments.
     */
    const totalPaid = payments
      .filter(
        (payment: any) =>
          payment.status?.toLowerCase() ===
          'completed',
      )
      .reduce(
        (
          total: number,
          payment: any,
        ) =>
          total +
          Number(payment.amount || 0),
        0,
      );

    /*
     * Count active leases for THIS tenant.
     */
    const activeLeases =
      leases.filter(
        (item: any) =>
          item.status?.toLowerCase() ===
          'active',
      ).length;

    /*
     * Return ONLY this tenant's information.
     */
    return {
      tenant,

      lease: activeLease,

      unit,

      property,

      payments,

      summary: {
        monthlyRent:
          activeLease.monthlyRent ?? 0,

        securityDeposit:
          activeLease.securityDeposit ?? 0,

        totalPaid,

        leaseStatus:
          activeLease.status ?? null,
      },

      statistics: {
        activeLeases,

        totalLeases:
          leases.length,

        totalPaid,
      },
    };
  }
}