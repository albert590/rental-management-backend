import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  Types,
} from 'mongoose';

import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';

import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // =========================
  // CREATE
  // =========================

  async create(
    createNotificationDto: CreateNotificationDto,
  ) {
    const notification =
      new this.notificationModel(
        createNotificationDto,
      );

    return notification.save();
  }

  // =========================
  // GET ALL
  // =========================

  async findAll() {
    return this.notificationModel
      .find()
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // =========================
  // GET FOR USER
  // =========================

  async findForUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    return this.notificationModel
      .find({
        $or: [
          {
            recipient: new Types.ObjectId(userId),
          },
          {
            recipient: null,
          },
        ],
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // =========================
  // GET FOR TENANT
  // =========================

  async findForTenant(tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) {
      return [];
    }

    return this.notificationModel
      .find({
        tenant: new Types.ObjectId(tenantId),
      })
      .sort({
        createdAt: -1,
      })
      .lean();
  }

  // =========================
  // GET ONE
  // =========================

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    const notification =
      await this.notificationModel
        .findById(id)
        .lean();

    if (!notification) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    return notification;
  }

  // =========================
  // MARK ONE AS READ
  // =========================

  async markAsRead(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    const notification =
      await this.notificationModel.findByIdAndUpdate(
        id,
        {
          read: true,
        },
        {
          new: true,
        },
      );

    if (!notification) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    return notification;
  }

  // =========================
  // MARK ALL AS READ
  // =========================

  async markAllAsRead() {
    await this.notificationModel.updateMany(
      {
        read: false,
      },
      {
        $set: {
          read: true,
        },
      },
    );

    return {
      message:
        'All notifications marked as read',
    };
  }

  // =========================
  // DELETE
  // =========================

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    const notification =
      await this.notificationModel.findByIdAndDelete(
        id,
      );

    if (!notification) {
      throw new NotFoundException(
        'Notification not found',
      );
    }

    return {
      message:
        'Notification deleted successfully',
    };
  }
}