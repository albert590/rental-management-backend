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

import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class BookingRequestsService {
  constructor(
    @InjectModel(BookingRequest.name)
    private readonly bookingRequestModel: Model<BookingRequestDocument>,

    private readonly tenantsService: TenantsService,
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

    /*
     * Convert User ID -> Tenant ID.
     */
    const user =
      await this.bookingRequestModel.db
        .collection('users')
        .findOne({
          _id: new Types.ObjectId(userId),
        });

    if (!user) {
      throw new NotFoundException(
        'User account not found',
      );
    }

    const userEmail = user.email;

    if (!userEmail) {
      throw new BadRequestException(
        'User account does not have an email address',
      );
    }

    const tenant =
      await this.tenantsService.findByEmail(userEmail);

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found for this account',
      );
    }

    const tenantId = tenant._id;

    /*
     * Prevent duplicate pending requests.
     */
    const existing =
      await this.bookingRequestModel.findOne({
        tenant: tenantId,
        unit: new Types.ObjectId(dto.unitId),
        status: 'pending',
      });

    if (existing) {
      throw new BadRequestException(
        'You already have a pending request for this unit',
      );
    }

    /*
     * Get unit.
     */
    const unit =
      await this.bookingRequestModel.db
        .collection('units')
        .findOne({
          _id: new Types.ObjectId(dto.unitId),
        });

    if (!unit) {
      throw new NotFoundException(
        'Unit not found',
      );
    }

    /*
     * Make sure the unit is available.
     */
    const unitStatus =
      String(unit.status || 'available').toLowerCase();

    if (
      unitStatus === 'occupied' ||
      unitStatus === 'rented' ||
      unitStatus === 'maintenance' ||
      unitStatus === 'under_maintenance'
    ) {
      throw new ConflictException(
        'This unit is not available for booking',
      );
    }

    /*
     * Get property.
     */
    const propertyId =
      unit.property ||
      unit.propertyId;

    if (!propertyId) {
      throw new BadRequestException(
        'This unit is not linked to a property',
      );
    }

    /*
     * Create booking request.
     */
    const request =
      await this.bookingRequestModel.create({
        tenant: tenantId,
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
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    /*
     * Convert User ID -> Tenant ID.
     */
    const user =
      await this.bookingRequestModel.db
        .collection('users')
        .findOne({
          _id: new Types.ObjectId(userId),
        });

    if (!user?.email) {
      throw new NotFoundException(
        'User account not found',
      );
    }

    const tenant =
      await this.tenantsService.findByEmail(
        user.email,
      );

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found for this account',
      );
    }

    return this.bookingRequestModel
      .find({
        tenant: tenant._id,
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

  /*
   * APPROVE / REJECT BOOKING REQUEST
   */
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
     * Prevent approving an already approved request.
     */
    if (
      status === 'approved' &&
      request.status === 'approved'
    ) {
      return this.findOne(id);
    }

    /*
     * Reject request.
     */
    if (status === 'rejected') {
      request.status = 'rejected';

      await request.save();

      return this.findOne(id);
    }

    /*
     * Approve request.
     */

    const tenantId = request.tenant;
    const unitId = request.unit;

    /*
     * Make sure tenant exists.
     */
    const tenant =
      await this.bookingRequestModel.db
        .collection('tenants')
        .findOne({
          _id: tenantId,
        });

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found',
      );
    }

    /*
     * Check existing active lease.
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
     * Get unit.
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
     * Get monthly rent.
     */
    const monthlyRent = Number(
      unit.monthlyRent ??
        unit.rent ??
        0,
    );

    /*
     * Security deposit defaults to
     * one month's rent.
     */
    const securityDeposit = monthlyRent;

    /*
     * Lease starts today.
     */
    const startDate = new Date();

    /*
     * One-year lease.
     */
    const endDate = new Date(startDate);

    endDate.setFullYear(
      endDate.getFullYear() + 1,
    );

    /*
     * Create lease.
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
     * Mark unit as occupied.
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
     * Mark request approved.
     */
    request.status = 'approved';

    await request.save();

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

  /*
   * EDIT BOOKING REQUEST
   */
  async update(
    id: string,
    dto: CreateBookingRequestDto,
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
     * Update message.
     */
    if (dto.message !== undefined) {
      request.message = dto.message;
    }

    /*
     * Update requested unit.
     */
    if (
      dto.unitId &&
      dto.unitId !== request.unit.toString()
    ) {
      if (
        !Types.ObjectId.isValid(dto.unitId)
      ) {
        throw new BadRequestException(
          'Invalid unit ID',
        );
      }

      const newUnit =
        await this.bookingRequestModel.db
          .collection('units')
          .findOne({
            _id: new Types.ObjectId(dto.unitId),
          });

      if (!newUnit) {
        throw new NotFoundException(
          'Unit not found',
        );
      }

      /*
       * Check availability.
       */
      const unitStatus =
        String(
          newUnit.status || 'available',
        ).toLowerCase();

      if (
        unitStatus === 'occupied' ||
        unitStatus === 'rented' ||
        unitStatus === 'maintenance' ||
        unitStatus ===
          'under_maintenance'
      ) {
        throw new ConflictException(
          'This unit is not available for booking',
        );
      }

      /*
       * Get property.
       */
      const propertyId =
        newUnit.property ||
        newUnit.propertyId;

      if (!propertyId) {
        throw new BadRequestException(
          'This unit is not linked to a property',
        );
      }

      /*
       * Update unit.
       */
      request.unit =
        new Types.ObjectId(dto.unitId);

      /*
       * Update property automatically
       * based on the selected unit.
       */
      request.property =
        new Types.ObjectId(propertyId);
    }

    await request.save();

    return this.findOne(id);
  }

  /*
   * DELETE BOOKING REQUEST
   */
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