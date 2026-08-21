import {
  BadRequestException,
  ConflictException,
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
     * Prevent approving the same request twice.
     */
    if (
      status === 'approved' &&
      request.status === 'approved'
    ) {
      return this.findOne(id);
    }

    /*
     * REJECT REQUEST
     *
     * No lease should be created.
     */
    if (status === 'rejected') {
      request.status = 'rejected';

      await request.save();

      return this.findOne(id);
    }

    /*
     * APPROVE REQUEST
     *
     * Create an active lease for the tenant.
     */

    const tenantId = request.tenant;
    const unitId = request.unit;

    /*
     * Check whether this unit already has
     * an active lease.
     */
    const existingLease =
      await this.bookingRequestModel.db
        .collection('leases')
        .findOne({
          unit: unitId,
          status: 'active',
        });

    if (existingLease) {
      throw new ConflictException(
        'This unit already has an active lease',
      );
    }

    /*
     * Get the unit from MongoDB.
     */
    const unit =
      await this.bookingRequestModel.db
        .collection('units')
        .findOne({
          _id: unitId,
        });

    if (!unit) {
      throw new NotFoundException(
        'Unit not found',
      );
    }

    /*
     * Get monthly rent from the unit.
     */
    const monthlyRent = Number(
      unit.monthlyRent ??
        unit.rent ??
        0,
    );

    /*
     * Default security deposit to the
     * monthly rent.
     *
     * This can later be changed from
     * the lease management screen.
     */
    const securityDeposit = monthlyRent;

    /*
     * Lease starts today.
     */
    const startDate = new Date();

    /*
     * Default lease period = 1 year.
     */
    const endDate = new Date(startDate);

    endDate.setFullYear(
      endDate.getFullYear() + 1,
    );

    /*
     * Create the lease.
     */
    const leaseResult =
      await this.bookingRequestModel.db
        .collection('leases')
        .insertOne({
          tenant: tenantId,
          unit: unitId,

          startDate,
          endDate,

          monthlyRent,
          securityDeposit,

          status: 'active',

          createdAt: new Date(),
          updatedAt: new Date(),
        });

    /*
     * Mark the unit as occupied.
     */
    await this.bookingRequestModel.db
      .collection('units')
      .updateOne(
        {
          _id: unitId,
        },
        {
          $set: {
            status: 'occupied',
            updatedAt: new Date(),
          },
        },
      );

    /*
     * Mark booking request as approved.
     */
    request.status = 'approved';

    await request.save();

    /*
     * Return both the approved request
     * and the newly-created lease.
     */
    const approvedRequest =
      await this.findOne(id);

    return {
      message:
        'Booking request approved and lease created successfully',

      bookingRequest:
        approvedRequest,

      leaseId:
        leaseResult.insertedId,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(
        'Invalid booking request ID',
      );
    }

    const request =
      await this.bookingRequestModel
        .findByIdAndDelete(id);

    if (!request) {
      throw new NotFoundException(
        'Booking request not found',
      );
    }

    return {
      success: true,
      message:
        'Booking request deleted successfully',
    };
  }
}