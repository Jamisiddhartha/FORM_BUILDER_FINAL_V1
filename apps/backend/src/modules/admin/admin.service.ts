import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.users.findMany({
      where: { deleted_at: null },
      include: { role: true },
      orderBy: { id: 'desc' },
    });
  }

  async getRoles() {
    return this.prisma.roles.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPermissions() {
    // Permissions are stored as 'resources' in your schema
    return this.prisma.resources.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createUser(data: {
    email: string;
    userType: string;
    roleId?: number;
    isEmailVerified?: number;
  }) {
    return this.prisma.users.create({
      data: {
        email: data.email,
        user_type: data.userType as any,
        role_id: data.roleId ?? null,
        is_email_verified: data.isEmailVerified ?? 0,
      },
      include: { role: true },
    });
  }

  async updateUser(
    id: number,
    data: {
      email?: string;
      userType?: string;
      roleId?: number;
      isEmailVerified?: number;
    },
  ) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.users.update({
      where: { id },
      data: {
        ...(data.email !== undefined && { email: data.email }),
        ...(data.userType !== undefined && { user_type: data.userType as any }),
        ...(data.roleId !== undefined && { role_id: data.roleId }),
        ...(data.isEmailVerified !== undefined && {
          is_email_verified: data.isEmailVerified,
        }),
      },
      include: { role: true },
    });
  }

  async deleteUser(id: number) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.users.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
