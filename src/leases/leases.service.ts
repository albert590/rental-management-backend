import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { TenantsService } from '../tenants/tenants.service';

import { CreateLeaseDto } from './dto/create-lease.dto';
import { Lease, LeaseDocument } from './schemas/lease.schema';

@Injectable()
export class LeasesService {
  constructor(
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocument>,

    private readonly tenantsService: TenantsService,
  ) {}

  // ============================================================
  // CREATE LEASE
  // ============================================================

  async create(createLeaseDto: CreateLeaseDto) {
    const tenantId = new Types.ObjectId(createLeaseDto.tenant);
    const unitId = new Types.ObjectId(createLeaseDto.unit);

    const existingLease = await this.leaseModel.findOne({
      unit: unitId,
      status: 'active',
    });

    if (existingLease) {
      throw new ConflictException(
        'This unit already has an active lease',
      );
    }

    const lease = new this.leaseModel({
      tenant: tenantId,
      unit: unitId,
      startDate: new Date(createLeaseDto.startDate),
      endDate: new Date(createLeaseDto.endDate),
      monthlyRent: createLeaseDto.monthlyRent,
      securityDeposit: createLeaseDto.securityDeposit,
      status: createLeaseDto.status ?? 'active',
    });

    const savedLease = await lease.save();

    return {
      message: 'Lease created successfully',
      lease: savedLease,
    };
  }

  // ============================================================
  // ADMIN - GET ALL LEASES
  // ============================================================

  async findAll() {
    return this.leaseModel
      .find()
      .populate(
        'tenant',
        'name email phone idNumber',
      )
      .populate({
        path: 'unit',
        select:
          'unitNumber floor bedrooms monthlyRent status property',
        populate: {
          path: 'property',
          select: 'name address city',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ============================================================
  // TENANT - GET LOGGED-IN TENANT LEASES
  // ============================================================

  async findMyLeases(userEmail: string) {
    const tenant =
      await this.tenantsService.findByEmail(userEmail);

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found for this account',
      );
    }

    return this.leaseModel
      .find({
        tenant: tenant._id,
      })
      .populate(
        'tenant',
        'name email phone idNumber',
      )
      .populate({
        path: 'unit',
        select:
          'unitNumber floor bedrooms monthlyRent status property',
        populate: {
          path: 'property',
          select: 'name address city',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ============================================================
  // GET ONE LEASE
  // ============================================================

  async findOne(id: string) {
    const lease = await this.leaseModel
      .findById(id)
      .populate(
        'tenant',
        'name email phone idNumber',
      )
      .populate({
        path: 'unit',
        select:
          'unitNumber floor bedrooms monthlyRent status property',
        populate: {
          path: 'property',
          select: 'name address city',
        },
      })
      .exec();

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  // ============================================================
  // GET LEASES BY TENANT
  // ============================================================

  async findByTenant(tenantId: string) {
    return this.leaseModel
      .find({
        tenant: new Types.ObjectId(tenantId),
      })
      .populate({
        path: 'tenant',
        select: 'name email phone idNumber',
      })
      .populate({
        path: 'unit',
        select:
          'unitNumber floor bedrooms monthlyRent status property',
        populate: {
          path: 'property',
          select: 'name address city',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ============================================================
  // GET LEASES BY UNIT
  // ============================================================

  async findByUnit(unitId: string) {
    return this.leaseModel
      .find({
        unit: new Types.ObjectId(unitId),
      })
      .populate(
        'tenant',
        'name email phone idNumber',
      )
      .populate({
        path: 'unit',
        select:
          'unitNumber floor bedrooms monthlyRent status property',
        populate: {
          path: 'property',
          select: 'name address city',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ============================================================
  // UPDATE LEASE
  // ============================================================

  async update(
    id: string,
    updateData: Partial<CreateLeaseDto>,
  ) {
    const lease =
      await this.leaseModel.findById(id);

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    // Update unit
    if (updateData.unit) {
      const unitId =
        new Types.ObjectId(updateData.unit);

      const newStatus =
        updateData.status ?? lease.status;

      if (newStatus === 'active') {
        const existingLease =
          await this.leaseModel.findOne({
            unit: unitId,
            status: 'active',
            _id: { $ne: id },
          });

        if (existingLease) {
          throw new ConflictException(
            'This unit already has an active lease',
          );
        }
      }

      lease.unit = unitId;
    }

    // Update tenant
    if (updateData.tenant) {
      lease.tenant =
        new Types.ObjectId(updateData.tenant);
    }

    // Update dates
    if (updateData.startDate) {
      lease.startDate =
        new Date(updateData.startDate);
    }

    if (updateData.endDate) {
      lease.endDate =
        new Date(updateData.endDate);
    }

    // Update rent
    if (
      updateData.monthlyRent !== undefined
    ) {
      lease.monthlyRent =
        updateData.monthlyRent;
    }

    // Update deposit
    if (
      updateData.securityDeposit !== undefined
    ) {
      lease.securityDeposit =
        updateData.securityDeposit;
    }

    // Update status
    if (updateData.status) {
      lease.status =
        updateData.status;
    }

    const updatedLease =
      await lease.save();

    return {
      message: 'Lease updated successfully',
      lease: updatedLease,
    };
  }

  // ============================================================
  // DELETE LEASE
  // ============================================================

  async remove(id: string) {
    const lease =
      await this.leaseModel.findByIdAndDelete(id);

    if (!lease) {
      throw new NotFoundException(
        'Lease not found',
      );
    }

    return {
      message: 'Lease deleted successfully',
    };
  }
}