import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateIncentiveApplicationDocumentDto, UpdateIncentiveApplicationDocumentDto } from './dto';
import { DocumentStatusCommonIncentive, DocumentApproveStatus } from '@prisma/client';

@Injectable()
export class IncentiveApplicationDocumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIncentiveApplicationDocumentDto) {
    return this.prisma.incentiveApplicationDocument.create({
      data: {
        userId: dto.userId,
        applicationId: dto.applicationId,
        documentId: dto.documentId,
        name: dto.name,
        type: dto.type,
        content: dto.content,
        size: dto.size,
        remarks: dto.remarks,
        deptRemarks: dto.deptRemarks,
        status: (dto.status || 'Y') as DocumentStatusCommonIncentive, // default
        departmentUserId: dto.departmentUserId,
        approveStatus: (dto.approveStatus || 'PENDING') as DocumentApproveStatus, // default
        createdBy: dto.createdBy,
      },
    });
  }

  async update(id: number, dto: UpdateIncentiveApplicationDocumentDto) {
    const existing = await this.prisma.incentiveApplicationDocument.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Build update data with proper type casting for enums
    const updateData: any = { modifiedOn: new Date() };
    if (dto.status !== undefined) updateData.status = dto.status as DocumentStatusCommonIncentive;
    if (dto.approveStatus !== undefined) updateData.approveStatus = dto.approveStatus as DocumentApproveStatus;
    
    // Copy other properties
    Object.keys(dto).forEach(key => {
      if (!['status', 'approveStatus'].includes(key)) {
        updateData[key] = dto[key as keyof UpdateIncentiveApplicationDocumentDto];
      }
    });

    return this.prisma.incentiveApplicationDocument.update({
      where: { id },
      data: updateData,
    });
  }

  async findAll() {
    return this.prisma.incentiveApplicationDocument.findMany();
  }

  async findOne(id: number) {
    const doc = await this.prisma.incentiveApplicationDocument.findUnique({ where: { id } });
    if (!doc) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return doc;
  }

  async remove(id: number) {
    const existing = await this.prisma.incentiveApplicationDocument.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Document with ID ${id} not found`);
    return this.prisma.incentiveApplicationDocument.delete({ where: { id } });
  }
}
