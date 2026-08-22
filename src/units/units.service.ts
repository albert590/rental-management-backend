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
      unitNumber: createUnitDto.unitNumber,
      floor: createUnitDto.floor,
      bedrooms: createUnitDto.bedrooms,
      monthlyRent: createUnitDto.monthlyRent,
      status: createUnitDto.status || 'available',
      property: propertyId,

      // Images
      image: createUnitDto.image || '',
      generalImage: createUnitDto.generalImage || '',
      bedroomImage: createUnitDto.bedroomImage || '',
      bathroomImage: createUnitDto.bathroomImage || '',
      toiletImage: createUnitDto.toiletImage || '',
      images: Array.isArray(createUnitDto.images)
        ? createUnitDto.images.filter(Boolean)
        : [],
    });

    const savedUnit = await unit.save();

    await savedUnit.populate(
      'property',
      'name address city',
    );

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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Unit not found');
    }

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
    if (!Types.ObjectId.isValid(propertyId)) {
      throw new NotFoundException('Property not found');
    }

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
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Unit not found');
    }

    const data: Record<string, any> = {
      ...updateData,
    };

    if (updateData.property) {
      if (!Types.ObjectId.isValid(updateData.property)) {
        throw new ConflictException(
          'Invalid property ID',
        );
      }

      data.property = new Types.ObjectId(
        updateData.property,
      );
    }

    if (Array.isArray(updateData.images)) {
      data.images = updateData.images.filter(Boolean);
    }

    const unit = await this.unitModel
      .findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
      })
      .populate('property', 'name address city')
      .exec();

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      message: 'Unit updated successfully',
      unit,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Unit not found');
    }

    const unit = await this.unitModel.findByIdAndDelete(id);

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    return {
      message: 'Unit deleted successfully',
    };
  }
}