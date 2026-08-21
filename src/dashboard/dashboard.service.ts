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
     * Use ONLY the currently authenticated
     * user's email.
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
     * Find ONLY this tenant.
     */
    const tenant = await this.tenantModel
      .findOne({
        email: authenticatedEmail,
      })
      .select('-__v')
      .lean();

    /*
     * User exists but has no tenant profile.
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
     * Find ONLY leases belonging to this tenant.
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
     * Tenant has no lease.
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
     * Prefer active lease.
     * Otherwise use most recent lease.
     */
    const activeLease =
      leases.find(
        (item: any) =>
          item.status?.toLowerCase() === 'active',
      ) ?? leases[0];

    /*
     * Find the unit belonging to this lease.
     */
    let unit: any = null;

    if (activeLease.unit) {
      unit = await this.unitModel
        .findById(activeLease.unit)
        .select('-__v')
        .lean();
    }

    /*
     * Find the property belonging to this unit.
     */
    let property: any = null;

    if (unit?.property) {
      property = await this.propertyModel
        .findById(unit.property)
        .select('-__v')
        .lean();
    }

    /*
     * IMPORTANT:
     *
     * The frontend expects:
     *
     * lease.unit.unitNumber
     * lease.property.name
     *
     * Therefore create a dashboard lease object
     * containing the actual unit and property.
     */
    const dashboardLease = {
      ...activeLease,

      unit: unit
        ? {
            _id: unit._id,
            unitNumber: unit.unitNumber,
            floor: unit.floor,
            bedrooms: unit.bedrooms,
            monthlyRent:
              unit.monthlyRent,
            status: unit.status,
            property: unit.property,
          }
        : null,

      property: property
        ? {
            _id: property._id,
            name: property.name,
            address: property.address,
            city: property.city,
            type: property.type,
          }
        : null,
    };

    /*
     * Find payments ONLY for this tenant's leases.
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
     * Calculate total completed payments.
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
     * Count active leases for this tenant.
     */
    const activeLeases =
      leases.filter(
        (item: any) =>
          item.status?.toLowerCase() ===
          'active',
      ).length;

    /*
     * Return tenant dashboard data.
     */
    return {
      tenant,

      /*
       * Use dashboardLease here instead of
       * the original activeLease.
       */
      lease: dashboardLease,

      /*
       * Keep these fields as well because
       * other frontend pages may use them.
       */
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