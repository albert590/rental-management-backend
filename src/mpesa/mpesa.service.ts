import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import axios from 'axios';

import { PaymentsService } from '../payments/payments.service';

import {
  PaymentMethod,
  PaymentStatus,
} from '../payments/schemas/payment.schema';

@Injectable()
export class MpesaService {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ==============================
  // ENVIRONMENT
  // ==============================

  private getMode(): string {
    return (
      this.configService.get<string>('MPESA_MODE') ||
      'mock'
    ).toLowerCase();
  }

  private getBaseUrl(): string {
    const environment =
      this.configService.get<string>(
        'MPESA_ENVIRONMENT',
      ) || 'sandbox';

    return environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  // ==============================
  // ACCESS TOKEN
  // ==============================

  async getAccessToken(): Promise<string> {
    const consumerKey =
      this.configService.get<string>(
        'MPESA_CONSUMER_KEY',
      );

    const consumerSecret =
      this.configService.get<string>(
        'MPESA_CONSUMER_SECRET',
      );

    if (!consumerKey || !consumerSecret) {
      throw new InternalServerErrorException(
        'M-PESA consumer credentials are not configured',
      );
    }

    const credentials = Buffer.from(
      `${consumerKey}:${consumerSecret}`,
    ).toString('base64');

    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization:
              `Basic ${credentials}`,
          },
        },
      );

      return response.data.access_token;
    } catch (error: any) {
      console.error(
        'M-PESA access token error:',
        error.response?.data ||
          error.message,
      );

      throw new InternalServerErrorException(
        error.response?.data ||
          'Failed to generate M-PESA access token',
      );
    }
  }

  // ==============================
  // STK PUSH
  // ==============================

  async stkPush(
    lease: string,
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ) {
    if (!lease) {
      throw new BadRequestException(
        'Lease ID is required',
      );
    }

    if (!phoneNumber) {
      throw new BadRequestException(
        'Phone number is required',
      );
    }

    if (!amount || amount <= 0) {
      throw new BadRequestException(
        'Amount must be greater than zero',
      );
    }

    const formattedPhone =
      this.formatPhoneNumber(phoneNumber);

    if (
      !/^254\d{9}$/.test(
        formattedPhone,
      )
    ) {
      throw new BadRequestException(
        'Invalid Kenyan phone number. Use format 254XXXXXXXXX',
      );
    }

    // ==============================
    // MOCK MODE
    // ==============================

    if (this.getMode() === 'mock') {
      return this.mockStkPush(
        lease,
        formattedPhone,
        amount,
        accountReference,
        transactionDesc,
      );
    }

    // ==============================
    // REAL DARAJA MODE
    // ==============================

    return this.realStkPush(
      lease,
      formattedPhone,
      amount,
      accountReference,
      transactionDesc,
    );
  }

  // ==============================
  // MOCK STK PUSH
  // ==============================

  private async mockStkPush(
    lease: string,
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ) {
    const merchantRequestId =
      `MOCK-MERCHANT-${Date.now()}`;

    const checkoutRequestId =
      `ws_CO_MOCK_${Date.now()}`;

    console.log(
      '================================',
    );

    console.log(
      'MOCK M-PESA STK PUSH',
    );

    console.log(
      'Lease:',
      lease,
    );

    console.log(
      'Phone:',
      phoneNumber,
    );

    console.log(
      'Amount:',
      amount,
    );

    console.log(
      'CheckoutRequestID:',
      checkoutRequestId,
    );

    console.log(
      '================================',
    );

    const payment =
      await this.paymentsService.createPayment({
        lease,
        amount,
        phoneNumber,
        accountReference,
        transactionDesc,
        merchantRequestId,
        checkoutRequestId,
        status:
          PaymentStatus.PENDING,
        paymentMethod:
          PaymentMethod.MPESA,
        mode: 'mock',
        resultCode: '0',
        resultDescription:
          'Success. Request accepted for processing',
      });

    return {
      success: true,
      mode: 'mock',
      message:
        'Mock M-PESA STK Push initiated successfully',
      payment,
      data: {
        MerchantRequestID:
          merchantRequestId,
        CheckoutRequestID:
          checkoutRequestId,
        ResponseCode: '0',
        ResponseDescription:
          'Success. Request accepted for processing',
        CustomerMessage:
          'Mock STK Push sent successfully',
        PhoneNumber:
          phoneNumber,
        Amount:
          amount,
        AccountReference:
          accountReference,
        TransactionDesc:
          transactionDesc,
      },
    };
  }

  // ==============================
  // REAL DARAJA STK PUSH
  // ==============================

  private async realStkPush(
    lease: string,
    phoneNumber: string,
    amount: number,
    accountReference: string,
    transactionDesc: string,
  ) {
    const shortcode =
      this.configService.get<string>(
        'MPESA_SHORTCODE',
      );

    const passkey =
      this.configService.get<string>(
        'MPESA_PASSKEY',
      );

    const callbackUrl =
      this.configService.get<string>(
        'MPESA_CALLBACK_URL',
      );

    if (!shortcode) {
      throw new InternalServerErrorException(
        'MPESA_SHORTCODE is not configured',
      );
    }

    if (!passkey) {
      throw new InternalServerErrorException(
        'MPESA_PASSKEY is not configured',
      );
    }

    if (!callbackUrl) {
      throw new InternalServerErrorException(
        'MPESA_CALLBACK_URL is not configured',
      );
    }

    const accessToken =
      await this.getAccessToken();

    const timestamp =
      this.getTimestamp();

    const password =
      Buffer.from(
        `${shortcode}${passkey}${timestamp}`,
      ).toString('base64');

    const payload = {
      BusinessShortCode:
        shortcode,
      Password:
        password,
      Timestamp:
        timestamp,
      TransactionType:
        'CustomerPayBillOnline',
      Amount:
        Math.round(amount),
      PartyA:
        phoneNumber,
      PartyB:
        shortcode,
      PhoneNumber:
        phoneNumber,
      CallBackURL:
        callbackUrl,
      AccountReference:
        accountReference ||
        'RENTAL-PAYMENT',
      TransactionDesc:
        transactionDesc ||
        'Rental payment',
    };

    try {
      const response =
        await axios.post(
          `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
          payload,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
              'Content-Type':
                'application/json',
            },
          },
        );

      const mpesaData =
        response.data;

      const payment =
        await this.paymentsService.createPayment({
          lease,
          amount,
          phoneNumber,
          accountReference,
          transactionDesc,
          merchantRequestId:
            mpesaData.MerchantRequestID,
          checkoutRequestId:
            mpesaData.CheckoutRequestID,
          status:
            PaymentStatus.PENDING,
          paymentMethod:
            PaymentMethod.MPESA,
          mode: 'daraja',
          resultCode:
            mpesaData.ResponseCode,
          resultDescription:
            mpesaData.ResponseDescription,
        });

      return {
        success: true,
        mode: 'daraja',
        message:
          'M-PESA STK Push initiated successfully',
        payment,
        data: mpesaData,
      };
    } catch (error: any) {
      console.error(
        'M-PESA STK Push error:',
        error.response?.data ||
          error.message,
      );

      throw new InternalServerErrorException(
        error.response?.data || {
          message:
            'Failed to initiate M-PESA STK Push',
          error:
            error.message,
        },
      );
    }
  }

  // ==============================
  // CALLBACK
  // ==============================

  async handleCallback(
    callbackData: any,
  ) {
    console.log(
      'M-PESA CALLBACK:',
      JSON.stringify(
        callbackData,
        null,
        2,
      ),
    );

    try {
      const stkCallback =
        callbackData?.Body?.stkCallback;

      if (!stkCallback) {
        return {
          success: false,
          message:
            'Invalid M-PESA callback format',
        };
      }

      const checkoutRequestId =
        stkCallback.CheckoutRequestID;

      const resultCode =
        Number(
          stkCallback.ResultCode,
        );

      const resultDescription =
        stkCallback.ResultDesc;

      if (!checkoutRequestId) {
        return {
          success: false,
          message:
            'CheckoutRequestID is missing',
        };
      }

      const payment =
        await this.paymentsService.findByCheckoutRequestId(
          checkoutRequestId,
        );

      if (!payment) {
        return {
          success: false,
          message:
            'Payment not found',
          checkoutRequestId,
        };
      }

      // ==============================
      // SUCCESS
      // ==============================

      if (resultCode === 0) {
        const items =
          stkCallback
            ?.CallbackMetadata
            ?.Item || [];

        let receiptNumber:
          | string
          | undefined;

        let transactionDate:
          | string
          | undefined;

        for (const item of items) {
          if (
            item.Name ===
            'MpesaReceiptNumber'
          ) {
            receiptNumber =
              String(item.Value);
          }

          if (
            item.Name ===
            'TransactionDate'
          ) {
            transactionDate =
              String(item.Value);
          }
        }

        const updatedPayment =
          await this.paymentsService.updateStatus(
            String(payment._id),
            PaymentStatus.COMPLETED,
            String(resultCode),
            resultDescription,
            receiptNumber,
            transactionDate,
          );

        return {
          success: true,
          message:
            'Payment completed successfully',
          payment:
            updatedPayment,
        };
      }

      // ==============================
      // FAILED / CANCELLED
      // ==============================

      const updatedPayment =
        await this.paymentsService.updateStatus(
          String(payment._id),
          PaymentStatus.FAILED,
          String(resultCode),
          resultDescription,
        );

      return {
        success: true,
        message:
          'Payment failed',
        payment:
          updatedPayment,
      };
    } catch (error: any) {
      console.error(
        'Callback processing error:',
        error.message,
      );

      return {
        success: false,
        message:
          'Failed to process M-PESA callback',
      };
    }
  }

  // ==============================
  // TIMESTAMP
  // ==============================

  private getTimestamp(): string {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1,
      ).padStart(2, '0');

    const day =
      String(
        now.getDate(),
      ).padStart(2, '0');

    const hours =
      String(
        now.getHours(),
      ).padStart(2, '0');

    const minutes =
      String(
        now.getMinutes(),
      ).padStart(2, '0');

    const seconds =
      String(
        now.getSeconds(),
      ).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // ==============================
  // PHONE FORMAT
  // ==============================

  private formatPhoneNumber(
    phoneNumber: string,
  ): string {
    let phone =
      phoneNumber
        .trim()
        .replace(/\s+/g, '');

    if (phone.startsWith('+254')) {
      phone =
        phone.substring(1);
    }

    if (phone.startsWith('07')) {
      phone =
        `254${phone.substring(1)}`;
    }

    if (phone.startsWith('01')) {
      phone =
        `254${phone.substring(1)}`;
    }

    return phone;
  }
}