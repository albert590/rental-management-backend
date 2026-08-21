import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';

import {
  PaymentMethod,
  PaymentStatus,
} from './schemas/payment.schema';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  // CREATE PAYMENT
  @Post()
  async createPayment(
    @Body()
    body: {
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
    },
  ) {
    return this.paymentsService.createPayment(body);
  }

  // GET ALL PAYMENTS
  @Get()
  async findAll() {
    return this.paymentsService.findAll();
  }

  // GET PAYMENTS BY LEASE
  @Get('lease/:leaseId')
  async findByLease(
    @Param('leaseId') leaseId: string,
  ) {
    return this.paymentsService.findByLease(leaseId);
  }

  // GET PAYMENT BY CHECKOUT ID
  @Get('checkout/:checkoutRequestId')
  async findByCheckoutRequestId(
    @Param('checkoutRequestId')
    checkoutRequestId: string,
  ) {
    return this.paymentsService.findByCheckoutRequestId(
      checkoutRequestId,
    );
  }

  // GET PAYMENT BY ID
  @Get(':id')
  async findOne(
    @Param('id') id: string,
  ) {
    return this.paymentsService.findOne(id);
  }

  // ADMIN APPROVE PAYMENT
  @Patch(':id/approve')
  async approvePayment(
    @Param('id') id: string,
  ) {
    return this.paymentsService.approvePayment(id);
  }

  // ADMIN REJECT PAYMENT
  @Patch(':id/reject')
  async rejectPayment(
    @Param('id') id: string,
    @Body()
    body: {
      reason?: string;
    },
  ) {
    return this.paymentsService.rejectPayment(
      id,
      body.reason,
    );
  }

  // UPDATE PAYMENT STATUS
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: PaymentStatus;
      resultCode?: string;
      resultDescription?: string;
      mpesaReceiptNumber?: string;
      transactionDate?: string;
    },
  ) {
    return this.paymentsService.updateStatus(
      id,
      body.status,
      body.resultCode,
      body.resultDescription,
      body.mpesaReceiptNumber,
      body.transactionDate,
    );
  }
}