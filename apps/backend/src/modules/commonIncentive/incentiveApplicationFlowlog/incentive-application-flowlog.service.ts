import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateIncentiveApplicationFlowlogDto,
  UpdateIncentiveApplicationFlowlogDto,
} from './dto';
import { ApprovalStatus, ApplicationStatus, RecordStatus, RecommendationStatus } from '@prisma/client';

@Injectable()
export class IncentiveApplicationFlowlogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIncentiveApplicationFlowlogDto) {
    return this.prisma.incentiveApplicationFlowlog.create({
      data: {
        applicationId: dto.applicationId,
        currentRoleId: dto.currentRoleId,
        nextRoleId: dto.nextRoleId,
        userId: dto.userId,
        approvedAmountByDepartment: dto.approvedAmountByDepartment,
        disbursedAmountByDepartment: dto.disbursedAmountByDepartment,
        remarks: dto.remarks,
        delayRemarks: dto.delayRemarks,
        additionalPostData: dto.additionalPostData,
        approvalStatus: dto.approvalStatus as ApprovalStatus,
        actionStatus: dto.actionStatus as ApplicationStatus,
        userAgent: dto.userAgent,
        remoteIpAddress: dto.remoteIpAddress,
        status: (dto.status || 'Y') as RecordStatus, // default
        createdDate: new Date(), // ✅ capture server hit time here
        file: dto.file,
        uploadedFileName: dto.uploadedFileName,
        approvedIncentive: dto.approvedIncentive,
        recommendation: dto.recommendation as RecommendationStatus | null | undefined,
      },
    });
  }

  async update(id: number, dto: UpdateIncentiveApplicationFlowlogDto) {
    const existing = await this.prisma.incentiveApplicationFlowlog.findUnique({
      where: { id },
    });

    if (!existing) throw new NotFoundException(`Flowlog with ID ${id} not found`);

    // Build update data with proper type casting for enums
    const updateData: any = { modifiedOn: new Date() };
    if (dto.approvalStatus !== undefined) updateData.approvalStatus = dto.approvalStatus as ApprovalStatus;
    if (dto.actionStatus !== undefined) updateData.actionStatus = dto.actionStatus as ApplicationStatus;
    if (dto.status !== undefined) updateData.status = dto.status as RecordStatus;
    if (dto.recommendation !== undefined) updateData.recommendation = dto.recommendation as RecommendationStatus | null;
    
    // Copy other properties
    Object.keys(dto).forEach(key => {
      if (!['approvalStatus', 'actionStatus', 'status', 'recommendation'].includes(key)) {
        updateData[key] = dto[key as keyof UpdateIncentiveApplicationFlowlogDto];
      }
    });

    return this.prisma.incentiveApplicationFlowlog.update({
      where: { id },
      data: updateData,
    });
  }

  async findAll() {
    return this.prisma.incentiveApplicationFlowlog.findMany();
  }

  async findOne(id: number) {
    const flowlog = await this.prisma.incentiveApplicationFlowlog.findUnique({ where: { id } });
    if (!flowlog) throw new NotFoundException(`Flowlog with ID ${id} not found`);
    return flowlog;
  }

  async remove(id: number) {
    const existing = await this.prisma.incentiveApplicationFlowlog.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Flowlog with ID ${id} not found`);
    return this.prisma.incentiveApplicationFlowlog.delete({ where: { id } });
  }
}
