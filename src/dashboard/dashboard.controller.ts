import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

interface AuthenticatedRequest extends Request {
  user: {
    _id?: string;
    id?: string;
    email: string;
    name?: string;
    role?: string;
  };
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  // Admin / Property Manager dashboard
  @Get()
  getStats() {
    return this.dashboardService.getStats();
  }

  // Tenant dashboard
  @Get('tenant')
  getTenantDashboard(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.dashboardService.getTenantDashboard(
      req.user.email,
    );
  }
}