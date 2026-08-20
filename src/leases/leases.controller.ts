import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeasesService } from './leases.service';

@Controller('leases')
@UseGuards(JwtAuthGuard)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
  ) {}

  @Post()
  create(
    @Body() createLeaseDto: CreateLeaseDto,
  ) {
    return this.leasesService.create(
      createLeaseDto,
    );
  }

  // ADMIN
  @Get()
  findAll() {
    return this.leasesService.findAll();
  }

  // TENANT
  @Get('my')
  findMyLeases(@Req() req: any) {
    return this.leasesService.findMyLeases(
      req.user.email,
    );
  }

  @Get('tenant/:tenantId')
  findByTenant(
    @Param('tenantId') tenantId: string,
  ) {
    return this.leasesService.findByTenant(
      tenantId,
    );
  }

  @Get('unit/:unitId')
  findByUnit(
    @Param('unitId') unitId: string,
  ) {
    return this.leasesService.findByUnit(
      unitId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leasesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateLeaseDto>,
  ) {
    return this.leasesService.update(
      id,
      updateData,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leasesService.remove(id);
  }
}