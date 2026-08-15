import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { MaintenanceService } from './maintenance.service';

@Controller('maintenance')
@UseGuards(JwtAuthGuard)
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
  ) {}

  @Post()
  create(
    @Body() createMaintenanceDto: CreateMaintenanceDto,
  ) {
    return this.maintenanceService.create(
      createMaintenanceDto,
    );
  }

  @Get()
  findAll() {
    return this.maintenanceService.findAll();
  }

  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId') tenantId: string,
  ) {
    return this.maintenanceService.findByTenant(
      tenantId,
    );
  }

  @Get('unit/:unitId')
  findByUnit(
    @Param('unitId') unitId: string,
  ) {
    return this.maintenanceService.findByUnit(
      unitId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.maintenanceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateMaintenanceDto>,
  ) {
    return this.maintenanceService.update(
      id,
      updateData,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.maintenanceService.remove(id);
  }
}