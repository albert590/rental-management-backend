import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { MpesaService } from './mpesa.service';

@Controller('mpesa')
export class MpesaController {
  constructor(
    private readonly mpesaService: MpesaService,
  ) {}

  // ==============================
  // TEST ACCESS TOKEN
  // ==============================

  @Get('token')
  async getToken() {
    return this.mpesaService.getAccessToken();
  }

  // ==============================
  // STK PUSH
  // ==============================

  @Post('stk-push')
  async stkPush(
    @Body()
    body: {
      lease: string;
      phoneNumber: string;
      amount: number;
      accountReference?: string;
      transactionDesc?: string;
    },
  ) {
    if (!body.lease) {
      return {
        success: false,
        message: 'Lease ID is required',
      };
    }

    if (!body.phoneNumber) {
      return {
        success: false,
        message: 'Phone number is required',
      };
    }

    if (!body.amount || body.amount <= 0) {
      return {
        success: false,
        message: 'Amount must be greater than zero',
      };
    }

    return this.mpesaService.stkPush(
      body.lease,
      body.phoneNumber,
      body.amount,
      body.accountReference ||
        'RENTAL-PAYMENT',
      body.transactionDesc ||
        'Rental payment',
    );
  }

  // ==============================
  // M-PESA CALLBACK
  // ==============================

  @Post('callback')
  async callback(
    @Body() body: any,
  ) {
    return this.mpesaService.handleCallback(
      body,
    );
  }
}