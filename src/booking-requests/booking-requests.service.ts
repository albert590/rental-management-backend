import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  BookingRequest,
  BookingRequestDocument,
} from './schemas/booking-request.schema';

import { CreateBookingRequestDto } from './dto/create-booking-request.dto';

@Injectable()
export class BookingRequestsService {
  constructor(
    @InjectModel(BookingRequest.name)
    private readonly bookingRequestModel: Model<BookingRequestDocument>,
  ) {}

  async create(
    userId: string,
    dto: CreateBookingRequestDto,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    if (!Types.ObjectId.isValid(dto.unitId)) {
      throw new BadRequestException('Invalid unit ID');
    }

    const existing = await this.bookingRequestModel.findOne({
      tenant: new Types.ObjectId(userId),
      unit: new Types.ObjectId(dto.unitId),
      status: 'pending',
    });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending request for this unit',
      );
    }

    const unit = await this.bookingRequestModel.db
      .collection('units')
      .findOne({
        _id: new Types.ObjectId(dto.unitId),
      });

    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const propertyId =
      unit.property ||
      unit.propertyId;

    if (!propertyId) {
      throw new BadRequestException(
        'This unit is not linked to a property',
      );
    }

    const request =
      await this.bookingRequestModel.create({
        tenant: new Types.ObjectId(userId),
        unit: new Types.ObjectId(dto.unitId),
        property: new Types.ObjectId(propertyId),
        message: dto.message || '',
        status: 'pending',
      });

    return this.bookingRequestModel
      .findById(request._id)
      .populate('tenant')
      .populate('unit')
      .populate('property');
  }

  async findAll() {
    return this.bookingRequestModel
      .find()
      .populate('tenant')
      .populate('unit')
      .populate('property')
      .sort({ createdAt: -1 });
  }

  async findMine(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.bookingRequestModel
      .find({
        tenant: new Types.ObjectId(userId),
      })
      .populate('unit')
      .populate('property')
      .sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid booking request ID',
      );
    }

    const request =
      await this.bookingRequestModel
        .findById(id)
        .populate('tenant')
        .populate('unit')
        .populate('property');

    if (!request) {
      throw new NotFoundException(
        'Booking request not found',
      );
    }

    return request;
  }

  async updateStatus(
    id: string,
    status: 'approved' | 'rejected',
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid booking request ID',
      );
    }

    const request =
      await this.bookingRequestModel.findById(id);

    if (!request) {
      throw new NotFoundException(
        'Booking request not found',
      );
    }

    /*
     * If the request is approved,
     * mark the requested unit as occupied.
     */
    if (status === 'approved') {
      const unitId = request.unit;

      if (!unitId) {
        throw new BadRequestException(
          'Booking request has no unit assigned',
        );
      }

      const unit = await this.bookingRequestModel.db
        .collection('units')
        .findOne({
          _id: new Types.ObjectId(unitId),
        });

      if (!unit) {
        throw new NotFoundException(
          'Requested unit not found',
        );
      }

      /*
       * Prevent approving a unit that is already occupied.
       */
      const currentStatus = String(
        unit.status || '',
      )
        .toLowerCase()
        .trim();

      if (
        currentStatus === 'occupied' ||
        currentStatus === 'rented'
      ) {
        throw new BadRequestException(
          'This unit is already occupied',
        );
      }

      /*
       * Update the real unit document in MongoDB.
       */
      await this.bookingRequestModel.db
        .collection('units')
        .updateOne(
          {
            _id: new Types.ObjectId(unitId),
          },
          {
            $set: {
              status: 'occupied',
            },
          },
        );
    }

    /*
     * Update the booking request status.
     */
    request.status = status;

    await request.save();

    return this.findOne(id);
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid booking request ID',
      );
    }

    const request =
      await this.bookingRequestModel.findByIdAndDelete(
        id,
      );

    if (!request) {
      throw new NotFoundException(
        'Booking request not found',
      );
    }

    return {
      success: true,
      message: 'Booking request deleted successfully',
    };
  }
}