import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHealth() {
    return {
      message: 'Rental Management API is running successfully',
      status: 'OK',
      service: 'rental-management-backend',
      timestamp: new Date().toISOString(),
    };
  }
}