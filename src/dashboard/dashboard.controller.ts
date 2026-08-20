import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
  ) {}

  // Existing admin/general dashboard
  @Get()
  getStats() {
    return this.dashboardService.getStats();
  }

  // Tenant dashboard
  @Get('tenant')
  getTenantDashboard(@Req() req: any) {
    return this.dashboardService.getTenantDashboard(
      req.user,
    );
  }
}