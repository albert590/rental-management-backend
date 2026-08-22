import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /*
   * PUBLIC TENANT REGISTRATION
   *
   * Anyone can register through the public
   * registration endpoint.
   *
   * Public registration ALWAYS creates a tenant.
   * The client cannot choose the role.
   */
  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email
      .toLowerCase()
      .trim();

    const existingUser =
      await this.userModel.findOne({ email });

    if (existingUser) {
      throw new ConflictException(
        'Email already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      10,
    );

    const user = new this.userModel({
      name: createUserDto.name.trim(),
      email,
      password: hashedPassword,
      role: 'tenant',
    });

    const savedUser = await user.save();

    return {
      message: 'Tenant account created successfully',
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
    };
  }

  /*
   * ADMIN CREATION
   *
   * This method is used only by the protected
   * /users/admin endpoint.
   *
   * The controller checks that the logged-in
   * user is an administrator before calling it.
   */
  async createAdmin(
    name: string,
    email: string,
    password: string,
  ) {
    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const existingUser =
      await this.userModel.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      throw new ConflictException(
        'Email already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    );

    const admin = new this.userModel({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
    });

    const savedAdmin = await admin.save();

    return {
      message: 'Admin account created successfully',
      user: {
        id: savedAdmin._id,
        name: savedAdmin.name,
        email: savedAdmin.email,
        role: savedAdmin.role,
      },
    };
  }

  /*
   * GET ALL USERS
   */
  async findAll() {
    return this.userModel
      .find()
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  /*
   * GET ONE USER
   */
  async findOne(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .exec();

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return user;
  }

  /*
   * FIND USER BY EMAIL
   */
  async findByEmail(email: string) {
    return this.userModel
      .findOne({
        email: email.toLowerCase().trim(),
      })
      .exec();
  }

  /*
   * FIND USER BY PASSWORD RESET TOKEN
   */
  async findByResetToken(token: string) {
    return this.userModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: {
          $gt: new Date(),
        },
      })
      .exec();
  }
}