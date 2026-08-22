import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  /*
   * PUBLIC TENANT REGISTRATION
   *
   * Every account created here gets:
   * role = tenant
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /*
   * CREATE ADMIN
   *
   * Only an authenticated admin can create
   * another admin account.
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard)
  createAdmin(
    @Req() req: Request,
    @Body()
    body: {
      name: string;
      email: string;
      password: string;
    },
  ) {
    const user = req.user as {
      role?: string;
    };

    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only administrators can create admin accounts',
      );
    }

    return this.usersService.createAdmin(
      body.name,
      body.email,
      body.password,
    );
  }

  /*
   * GET ALL USERS
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  /*
   * GET LOGGED-IN USER
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: Request) {
    return {
      message: 'Profile retrieved successfully',
      user: req.user,
    };
  }

  /*
   * GET ONE USER
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}