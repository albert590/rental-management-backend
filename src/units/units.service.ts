import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateUnitDto } from './dto/create-unit.dto';
import { Unit, UnitDocument } from './schemas/unit.schema';

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocument>,
  ) {}

  async create(createUnitDto: CreateUnitDto) {
    const propertyId = new Types.ObjectId(createUnitDto.property);

    const existingUnit = await this.unitModel.findOne({
      unitNumber: createUnitDto.unitNumber,
      property: propertyId,
    });

    if (existingUnit) {
      throw new ConflictException(
        'This unit already exists in this property',
      );
    }

    const unit = new this.unitModel({
      ...createUnitDto,
      property: propertyId,
    });

    const savedUnit = await unit.save();

    return {
      message: 'Unit created successfully',
      unit: savedUnit,
    };
  }

  async findAll() {
    return this.unitModel
      .find()
      .populate('property', 'name address city')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const unit = await this.unitModel
      .findById(id)
      .populate('property', 'name address city')
      .exec();

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return unit;
  }

  async findByProperty(propertyId: string) {
    return this.unitModel
      .find({
        property: new Types.ObjectId(propertyId),
      })
      .populate('property', 'name address city')
      .sort({ unitNumber: 1 })
      .exec();
  }

  async update(
    id: string,
    updateData: Partial<CreateUnitDto>,
  ) {
    if (updateData.property) {
      updateData.property = new Types.ObjectId(
        updateData.property,
      ) as any;
    }

    const unit = await this.unitModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      message: 'Unit updated successfully',
      unit,
    };
  }

  async remove(id: string) {
    const unit = await this.unitModel.findByIdAndDelete(id);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      message: 'Unit deleted successfully',
    };
  }
}