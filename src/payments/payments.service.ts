import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Payment,
  PaymentDocument,
} from './schemas/payment.schema';

import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const payment = await this.paymentModel.create({
      ...createPaymentDto,
      lease: new Types.ObjectId(createPaymentDto.lease),
      paymentDate: new Date(createPaymentDto.paymentDate),
    });

    return {
      message: 'Payment created successfully',
      payment,
    };
  }

  async findAll() {
    return this.paymentModel
      .find()
      .populate('lease')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByLease(leaseId: string) {
    return this.paymentModel
      .find({
        lease: new Types.ObjectId(leaseId),
      })
      .populate('lease')
      .sort({ paymentDate: -1 })
      .exec();
  }

  async findOne(id: string) {
    const payment = await this.paymentModel
      .findById(id)
      .populate('lease')
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(
    id: string,
    updateData: Partial<CreatePaymentDto>,
  ) {
    const payment = await this.paymentModel.findById(id);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (updateData.lease) {
      payment.lease = new Types.ObjectId(updateData.lease);
    }

    if (updateData.amount !== undefined) {
      payment.amount = updateData.amount;
    }

    if (updateData.paymentDate) {
      payment.paymentDate = new Date(
        updateData.paymentDate,
      );
    }

    if (updateData.paymentMethod) {
      payment.paymentMethod = updateData.paymentMethod;
    }

    if (updateData.reference) {
      payment.reference = updateData.reference;
    }

    if (updateData.status) {
      payment.status = updateData.status;
    }

    const updatedPayment = await payment.save();

    return {
      message: 'Payment updated successfully',
      payment: updatedPayment,
    };
  }

  async remove(id: string) {
    const payment = await this.paymentModel.findByIdAndDelete(id);

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return {
      message: 'Payment deleted successfully',
    };
  }
}