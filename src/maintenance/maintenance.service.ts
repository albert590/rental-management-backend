import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Maintenance,
  MaintenanceDocument,
} from './schemas/maintenance.schema';

import { CreateMaintenanceDto } from './dto/create-maintenance.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectModel(Maintenance.name)
    private readonly maintenanceModel: Model<MaintenanceDocument>,
  ) {}

  async create(createMaintenanceDto: CreateMaintenanceDto) {
    const maintenance = await this.maintenanceModel.create({
      ...createMaintenanceDto,
      unit: new Types.ObjectId(createMaintenanceDto.unit),
      tenant: new Types.ObjectId(createMaintenanceDto.tenant),
    });

    return {
      message: 'Maintenance request created successfully',
      maintenance,
    };
  }

  async findAll() {
    return this.maintenanceModel
      .find()
      .populate('unit')
      .populate('tenant')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByTenant(tenantId: string) {
    return this.maintenanceModel
      .find({
        tenant: new Types.ObjectId(tenantId),
      })
      .populate('unit')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUnit(unitId: string) {
    return this.maintenanceModel
      .find({
        unit: new Types.ObjectId(unitId),
      })
      .populate('tenant')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const maintenance = await this.maintenanceModel
      .findById(id)
      .populate('unit')
      .populate('tenant')
      .exec();

    if (!maintenance) {
      throw new NotFoundException(
        'Maintenance request not found',
      );
    }

    return maintenance;
  }

  async update(
    id: string,
    updateData: Partial<CreateMaintenanceDto>,
  ) {
    const maintenance =
      await this.maintenanceModel.findById(id);

    if (!maintenance) {
      throw new NotFoundException(
        'Maintenance request not found',
      );
    }

    if (updateData.unit) {
      maintenance.unit = new Types.ObjectId(
        updateData.unit,
      );
    }

    if (updateData.tenant) {
      maintenance.tenant = new Types.ObjectId(
        updateData.tenant,
      );
    }

    if (updateData.title !== undefined) {
      maintenance.title = updateData.title;
    }

    if (updateData.description !== undefined) {
      maintenance.description = updateData.description;
    }

    if (updateData.priority !== undefined) {
      maintenance.priority = updateData.priority;
    }

    if (updateData.status !== undefined) {
      maintenance.status = updateData.status;
    }

    const updatedMaintenance =
      await maintenance.save();

    return {
      message: 'Maintenance request updated successfully',
      maintenance: updatedMaintenance,
    };
  }

  async remove(id: string) {
    const maintenance =
      await this.maintenanceModel.findByIdAndDelete(id);

    if (!maintenance) {
      throw new NotFoundException(
        'Maintenance request not found',
      );
    }

    return {
      message: 'Maintenance request deleted successfully',
    };
  }
}