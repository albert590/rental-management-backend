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
import { BookingRequestsService } from './booking-requests.service';
import { CreateBookingRequestDto } from './dto/create-booking-request.dto';

@Controller('booking-requests')
@UseGuards(JwtAuthGuard)
export class BookingRequestsController {
  constructor(
    private readonly bookingRequestsService: BookingRequestsService,
  ) {}

  @Post()
  create(
    @Req() req: any,
    @Body() dto: CreateBookingRequestDto,
  ) {
    return this.bookingRequestsService.create(
      req.user.sub,
      dto,
    );
  }

  @Get()
  findAll() {
    return this.bookingRequestsService.findAll();
  }

  @Get('mine')
  findMine(@Req() req: any) {
    return this.bookingRequestsService.findMine(
      req.user.sub,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingRequestsService.findOne(id);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string) {
    return this.bookingRequestsService.updateStatus(
      id,
      'approved',
    );
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string) {
    return this.bookingRequestsService.updateStatus(
      id,
      'rejected',
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: CreateBookingRequestDto,
  ) {
    return this.bookingRequestsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bookingRequestsService.remove(id);
  }
}