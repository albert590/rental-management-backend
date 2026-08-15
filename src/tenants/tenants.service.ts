import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateTenantDto } from './dto/create-tenant.dto';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    const existingTenant = await this.tenantModel.findOne({
      $or: [
        { email: createTenantDto.email },
        { idNumber: createTenantDto.idNumber },
      ],
    });

    if (existingTenant) {
      throw new ConflictException(
        'A tenant with this email or ID number already exists',
      );
    }

    const tenant = new this.tenantModel(createTenantDto);
    const savedTenant = await tenant.save();

    return {
      message: 'Tenant created successfully',
      tenant: savedTenant,
    };
  }

  async findAll() {
    return this.tenantModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const tenant = await this.tenantModel.findById(id).exec();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(
    id: string,
    updateData: Partial<CreateTenantDto>,
  ) {
    if (updateData.email || updateData.idNumber) {
      const conditions: Record<string, string>[] = [];

      if (updateData.email) {
        conditions.push({ email: updateData.email });
      }

      if (updateData.idNumber) {
        conditions.push({ idNumber: updateData.idNumber });
      }

      const existingTenant = await this.tenantModel.findOne({
        $or: conditions,
        _id: { $ne: id },
      });

      if (existingTenant) {
        throw new ConflictException(
          'Another tenant already has this email or ID number',
        );
      }
    }

    const tenant = await this.tenantModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      message: 'Tenant updated successfully',
      tenant,
    };
  }

  async remove(id: string) {
    const tenant = await this.tenantModel.findByIdAndDelete(id);

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      message: 'Tenant deleted successfully',
    };
  }
}