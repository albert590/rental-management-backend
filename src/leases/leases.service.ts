import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateLeaseDto } from './dto/create-lease.dto';
import { Lease, LeaseDocument } from './schemas/lease.schema';

@Injectable()
export class LeasesService {
  constructor(
    @InjectModel(Lease.name)
    private readonly leaseModel: Model<LeaseDocument>,
  ) {}

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
      ...createLeaseDto,
      tenant: tenantId,
      unit: unitId,
      startDate: new Date(createLeaseDto.startDate),
      endDate: new Date(createLeaseDto.endDate),
    });

    const savedLease = await lease.save();

    return {
      message: 'Lease created successfully',
      lease: savedLease,
    };
  }

  async findAll() {
    return this.leaseModel
      .find()
      .populate('tenant', 'name email phone idNumber')
      .populate(
        'unit',
        'unitNumber floor bedrooms monthlyRent status',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const lease = await this.leaseModel
      .findById(id)
      .populate('tenant', 'name email phone idNumber')
      .populate(
        'unit',
        'unitNumber floor bedrooms monthlyRent status',
      )
      .exec();

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return lease;
  }

  async findByTenant(tenantId: string) {
    return this.leaseModel
      .find({
        tenant: new Types.ObjectId(tenantId),
      })
      .populate(
        'unit',
        'unitNumber floor bedrooms monthlyRent status',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUnit(unitId: string) {
    return this.leaseModel
      .find({
        unit: new Types.ObjectId(unitId),
      })
      .populate(
        'tenant',
        'name email phone idNumber',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateLeaseDto>,
  ) {
    const lease = await this.leaseModel.findById(id);

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (updateData.unit) {
      const unitId = new Types.ObjectId(updateData.unit);

      if (updateData.status === 'active') {
        const existingLease = await this.leaseModel.findOne({
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

    if (updateData.tenant) {
      lease.tenant = new Types.ObjectId(updateData.tenant);
    }

    if (updateData.startDate) {
      lease.startDate = new Date(updateData.startDate);
    }

    if (updateData.endDate) {
      lease.endDate = new Date(updateData.endDate);
    }

    if (updateData.monthlyRent !== undefined) {
      lease.monthlyRent = updateData.monthlyRent;
    }

    if (updateData.securityDeposit !== undefined) {
      lease.securityDeposit = updateData.securityDeposit;
    }

    if (updateData.status) {
      lease.status = updateData.status;
    }

    const updatedLease = await lease.save();

    return {
      message: 'Lease updated successfully',
      lease: updatedLease,
    };
  }

  async remove(id: string) {
    const lease = await this.leaseModel.findByIdAndDelete(id);

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    return {
      message: 'Lease deleted successfully',
    };
  }
}