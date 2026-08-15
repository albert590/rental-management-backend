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
import { CreateUnitDto } from './dto/create-unit.dto';
import { UnitsService } from './units.service';

@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(
    private readonly unitsService: UnitsService,
  ) {}

  @Post()
  create(@Body() createUnitDto: CreateUnitDto) {
    return this.unitsService.create(createUnitDto);
  }

  @Get()
  findAll() {
    return this.unitsService.findAll();
  }

  @Get('/property/:propertyId')
  findByProperty(
    @Param('propertyId') propertyId: string,
  ) {
    return this.unitsService.findByProperty(propertyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateUnitDto>,
  ) {
    return this.unitsService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}