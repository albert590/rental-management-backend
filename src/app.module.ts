import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MpesaModule } from './mpesa/mpesa.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BookingRequestsModule } from './booking-requests/booking-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),

        connectionFactory: (connection) => {
          connection.on('connected', () => {
            Logger.log(
              'MongoDB connected successfully',
              'Database',
            );
          });

          connection.on('error', (error: Error) => {
            Logger.error(
              `MongoDB connection error: ${error.message}`,
              'Database',
            );
          });

          return connection;
        },
      }),
    }),

    // Application modules
    UsersModule,
    AuthModule,
    PropertiesModule,
    UnitsModule,
    TenantsModule,
    LeasesModule,
    PaymentsModule,
    MaintenanceModule,
    DashboardModule,

    // M-PESA integration
    MpesaModule,

    // Notifications
    NotificationsModule,

    BookingRequestsModule,
  ],

  controllers: [
    AppController,
  ],

  providers: [
    AppService,
  ],
})
export class AppModule {}