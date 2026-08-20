import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Property,
  PropertyDocument,
} from './schemas/property.schema';

import { CreatePropertyDto } from './dto/create-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async create(
    createPropertyDto: CreatePropertyDto,
    ownerId: string,
  ) {
    const property = await this.propertyModel.create({
      ...createPropertyDto,
      owner: ownerId,
    });

    return {
      message: 'Property created successfully',
      property,
    };
  }

  async findAll() {
    return this.propertyModel
      .find()
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const property =
      await this.propertyModel.findById(id);

    if (!property) {
      throw new NotFoundException(
        'Property not found',
      );
    }

    return property;
  }

  async update(
    id: string,
    updateData: Partial<CreatePropertyDto>,
  ) {
    const property =
      await this.propertyModel.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

    if (!property) {
      throw new NotFoundException(
        'Property not found',
      );
    }

    return {
      message: 'Property updated successfully',
      property,
    };
  }

  async remove(id: string) {
    const property =
      await this.propertyModel.findByIdAndDelete(id);

    if (!property) {
      throw new NotFoundException(
        'Property not found',
      );
    }

    return {
      message: 'Property deleted successfully',
    };
  }
}