import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Payment,
  PaymentDocument,
  PaymentMethod,
  PaymentStatus,
} from './schemas/payment.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  // ==============================
  // CREATE PAYMENT
  // ==============================

  async createPayment(data: {
    lease: string;
    amount: number;
    phoneNumber?: string;
    accountReference?: string;
    transactionDesc?: string;
    merchantRequestId?: string;
    checkoutRequestId?: string;
    mpesaReceiptNumber?: string;
    status?: PaymentStatus;
    paymentMethod?: PaymentMethod;
    mode?: string;
    resultCode?: string;
    resultDescription?: string;
    transactionDate?: string;
    reference?: string;
  }) {
    if (!Types.ObjectId.isValid(data.lease)) {
      throw new NotFoundException(
        'Invalid lease ID',
      );
    }

    if (!data.amount || data.amount <= 0) {
      throw new NotFoundException(
        'Payment amount must be greater than zero',
      );
    }

    const payment =
      new this.paymentModel({
        lease: new Types.ObjectId(
          data.lease,
        ),

        amount: data.amount,

        paymentDate: new Date(),

        paymentMethod:
          data.paymentMethod ||
          PaymentMethod.MPESA,

        reference:
          data.reference,

        status:
          data.status ||
          PaymentStatus.PENDING,

        phoneNumber:
          data.phoneNumber,

        accountReference:
          data.accountReference,

        transactionDesc:
          data.transactionDesc,

        merchantRequestId:
          data.merchantRequestId,

        checkoutRequestId:
          data.checkoutRequestId,

        mpesaReceiptNumber:
          data.mpesaReceiptNumber,

        resultCode:
          data.resultCode,

        resultDescription:
          data.resultDescription,

        transactionDate:
          data.transactionDate,

        mode:
          data.mode || 'mock',
      });

    return payment.save();
  }

  // ==============================
  // GET ALL PAYMENTS
  // ==============================

  async findAll() {
    return this.paymentModel
      .find()
      .populate('lease')
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // ==============================
  // GET PAYMENTS BY LEASE
  // ==============================

  async findByLease(
    leaseId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        leaseId,
      )
    ) {
      throw new NotFoundException(
        'Invalid lease ID',
      );
    }

    return this.paymentModel
      .find({
        lease: new Types.ObjectId(
          leaseId,
        ),
      })
      .populate('lease')
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // ==============================
  // GET PAYMENT BY ID
  // ==============================

  async findOne(id: string) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        'Invalid payment ID',
      );
    }

    const payment =
      await this.paymentModel
        .findById(id)
        .populate('lease')
        .exec();

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    return payment;
  }

  // ==============================
  // UPDATE PAYMENT STATUS
  // ==============================

  async updateStatus(
    id: string,
    status: PaymentStatus,
    resultCode?: string,
    resultDescription?: string,
    mpesaReceiptNumber?: string,
    transactionDate?: string,
  ) {
    if (
      !Types.ObjectId.isValid(id)
    ) {
      throw new NotFoundException(
        'Invalid payment ID',
      );
    }

    const payment =
      await this.paymentModel.findById(
        id,
      );

    if (!payment) {
      throw new NotFoundException(
        'Payment not found',
      );
    }

    payment.status = status;

    if (
      resultCode !== undefined
    ) {
      payment.resultCode =
        resultCode;
    }

    if (
      resultDescription !==
      undefined
    ) {
      payment.resultDescription =
        resultDescription;
    }

    if (
      mpesaReceiptNumber !==
      undefined
    ) {
      payment.mpesaReceiptNumber =
        mpesaReceiptNumber;
    }

    if (
      transactionDate !==
      undefined
    ) {
      payment.transactionDate =
        transactionDate;
    }

    return payment.save();
  }

  // ==============================
  // FIND BY CHECKOUT REQUEST ID
  // ==============================

  async findByCheckoutRequestId(
    checkoutRequestId: string,
  ) {
    return this.paymentModel
      .findOne({
        checkoutRequestId,
      })
      .populate('lease')
      .exec();
  }

  // ==============================
  // FIND BY M-PESA RECEIPT
  // ==============================

  async findByReceiptNumber(
    receiptNumber: string,
  ) {
    return this.paymentModel
      .findOne({
        mpesaReceiptNumber:
          receiptNumber,
      })
      .populate('lease')
      .exec();
  }
}