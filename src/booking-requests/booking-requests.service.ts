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

  /*
   * Convert authenticated User ID -> real Tenant ID.
   *
   * IMPORTANT:
   * BookingRequest.tenant must ALWAYS contain
   * the Tenant document ID, NOT the User document ID.
   */
  private async getTenantIdFromUserId(
    userId: string,
  ): Promise<Types.ObjectId> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.bookingRequestModel.db
      .collection('users')
      .findOne({
        _id: new Types.ObjectId(userId),
      });

    if (!user) {
      throw new NotFoundException(
        'User account not found',
      );
    }

    const email = String(user.email || '')
      .toLowerCase()
      .trim();

    if (!email) {
      throw new BadRequestException(
        'User account does not have an email address',
      );
    }

    const tenant =
      await this.tenantsService.findByEmail(email);

    if (!tenant) {
      throw new NotFoundException(
        'Tenant profile not found for this account',
      );
    }

    /*
     * Always return the REAL Tenant _id.
     */
    return new Types.ObjectId(tenant._id);
  }

  /*
   * Get a unit by ID.
   */
  private async getUnit(unitId: string) {
    if (!Types.ObjectId.isValid(unitId)) {
      throw new BadRequestException(
        'Invalid unit ID',
      );
    }

    const unit =
      await this.bookingRequestModel.db
        .collection('units')
        .findOne({
          _id: new Types.ObjectId(unitId),
        });

    if (!unit) {
      throw new NotFoundException(
        'Unit not found',
      );
    }

    return unit;
  }

  /*
   * Make sure a unit can be booked.
   */
  private checkUnitAvailability(unit: any) {
    const status = String(
      unit.status || 'available',
    ).toLowerCase();

    const unavailableStatuses = [
      'occupied',
      'rented',
      'maintenance',
      'under_maintenance',
    ];

    if (unavailableStatuses.includes(status)) {
      throw new ConflictException(
        'This unit is not available for booking',
      );
    }
  }

  /*
   * Get property ID from a unit.
   */
  private getPropertyId(unit: any): Types.ObjectId {
    const propertyId =
      unit.property || unit.propertyId;

    if (!propertyId) {
      throw new BadRequestException(
        'This unit is not linked to a property',
      );
    }

    if (!Types.ObjectId.isValid(propertyId)) {
      throw new BadRequestException(
        'Invalid property ID',
      );
    }

    return new Types.ObjectId(propertyId);
  }

  /*
   * CREATE BOOKING REQUEST
   */
  async create(
    userId: string,
    dto: CreateBookingRequestDto,
  ) {
    /*
     * Convert authenticated User ID to
     * the correct Tenant ID.
     */
    const tenantId =
      await this.getTenantIdFromUserId(userId);

    /*
     * Validate and get unit.
     */
    const unit = await this.getUnit(dto.unitId);

    /*
     * Make sure unit is available.
     */
    this.checkUnitAvailability(unit);

    /*
     * Get property from unit.
     */
    const propertyId =
      this.getPropertyId(unit);

    /*
     * Prevent duplicate pending requests
     * for the same tenant and unit.
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
     * IMPORTANT:
     *
     * tenant = Tenant ID
     * unit = Unit ID
     * property = Property ID
     *
     * Never store userId in tenant.
     */
    const request =
      await this.bookingRequestModel.create({
        tenant: tenantId,
        unit: new Types.ObjectId(dto.unitId),
        property: propertyId,
        message: dto.message?.trim() || '',
        status: 'pending',
      });

    return this.bookingRequestModel
      .findById(request._id)
      .populate('tenant')
      .populate('unit')
      .populate('property');
  }

  /*
   * GET ALL BOOKING REQUESTS
   */
  async findAll() {
    return this.bookingRequestModel
      .find()
      .populate('tenant')
      .populate('unit')
      .populate('property')
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
   * GET CURRENT TENANT'S BOOKING REQUESTS
   */
  async findMine(userId: string) {
    const tenantId =
      await this.getTenantIdFromUserId(userId);

    return this.bookingRequestModel
      .find({
        tenant: tenantId,
      })
      .populate('tenant')
      .populate('unit')
      .populate('property')
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
   * GET ONE BOOKING REQUEST
   */
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
        .populate('property')
        .exec();

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
     * Already approved.
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
     * Verify tenant exists.
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
     * Check if the unit already has an
     * active lease.
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
     * Make sure unit is still available.
     */
    this.checkUnitAvailability(unit);

    /*
     * Get monthly rent.
     */
    const monthlyRent = Number(
      unit.monthlyRent ??
        unit.rent ??
        0,
    );

    /*
     * Security deposit defaults to one
     * month's rent.
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
     * Mark booking request approved.
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
      request.message =
        dto.message.trim();
    }

    /*
     * Update requested unit.
     */
    if (
      dto.unitId &&
      dto.unitId !== request.unit.toString()
    ) {
      const newUnit =
        await this.getUnit(dto.unitId);

      this.checkUnitAvailability(newUnit);

      const propertyId =
        this.getPropertyId(newUnit);

      /*
       * Update unit.
       */
      request.unit =
        new Types.ObjectId(dto.unitId);

      /*
       * Automatically update property.
       */
      request.property = propertyId;
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