import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    PaymentsModule,
  ],

  controllers: [
    MpesaController,
  ],

  providers: [
    MpesaService,
  ],

  exports: [
    MpesaService,
  ],
})
export class MpesaModule {}