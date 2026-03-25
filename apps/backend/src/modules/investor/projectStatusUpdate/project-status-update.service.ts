import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectStatusUpdateDto } from './dto';

@Injectable()
export class ProjectStatusUpdateService {
  constructor(private prisma: PrismaService) {}

  async getCafOptions(userId: bigint) {
    const allowedServiceIds = ['591.0', '943.0'];
    const submissions = await this.prisma.applicationSubmission.findMany({
      where: {
        userId,
        applicationStatus: 'A',
        serviceId: { in: allowedServiceIds },
      },
      orderBy: { submissionId: 'desc' },
      select: {
        submissionId: true,
        unitName: true,
        serviceId: true,
      },
    });

    return submissions.map((item) => ({
      submissionId: item.submissionId,
      unitName: item.unitName || '',
      serviceId: item.serviceId,
      label: `${item.unitName || 'CAF'} - ${item.submissionId}`,
    }));
  }

  async create(userId: bigint, dto: CreateProjectStatusUpdateDto) {
    return this.prisma.projectStatusUpdate.create({
      data: {
        cafId: dto.cafId,
        userId,
        lastApprovalStatus: dto.lastApprovalStatus,
        trialProduction: dto.trialProduction,
        categoryA: dto.categoryA,
        categoryB: dto.categoryB,
        categoryC: dto.categoryC,
        categoryD: dto.categoryD,
        male: dto.male,
        female: dto.female,
        others: dto.others,
        totalEmployment: dto.totalEmployment,
        commercialCommencementDate: dto.commercialCommencementDate
          ? new Date(dto.commercialCommencementDate)
          : null,
        landType: dto.landType,
        landAllotmentStage: dto.landAllotmentStage,
        projectStatus: dto.projectStatus,
        currentStatus: dto.currentStatus,
        notImplementationReason: dto.notImplementationReason,
        droppedWithdrawnRemarks: dto.droppedWithdrawnRemarks,
        remarks: dto.remarks,
      },
    });
  }
}
