import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, renameSync } from 'fs';
import { SkipResourceCheck } from '../../../common/skip-resource-check.decorator';
import { CommonDocumentService } from './document.service';
import {
  DocumentChecklistQueryDto,
  DocumentUploadsQueryDto,
  DocumentUploadDto,
  DocumentSyncDto,
} from './dto/document.dto';
import { JwtGuard } from '../../auth/guards/jwt.guard';

@Controller('common/documents')
export class CommonDocumentController {
  constructor(private readonly documentService: CommonDocumentService) {}

  @Get('checklist')
  @UseGuards(JwtGuard)
  @SkipResourceCheck()
  async getChecklist(@Query() query: DocumentChecklistQueryDto) {
    if (!query.serviceId) {
      throw new BadRequestException('serviceId is required');
    }
    return this.documentService.getDocumentChecklist(query.serviceId);
  }

  @Get('dms')
  @UseGuards(JwtGuard)
  @SkipResourceCheck()
  async getDms(@Query('serviceId') serviceId?: string) {
    if (!serviceId) {
      throw new BadRequestException('serviceId is required');
    }
    return this.documentService.getServiceDms(serviceId);
  }

  @Get('uploads')
  @UseGuards(JwtGuard)
  @SkipResourceCheck()
  async getUploads(@Req() req: any, @Query() query: DocumentUploadsQueryDto) {
    if (!query.submissionId || !query.serviceId) {
      throw new BadRequestException('submissionId and serviceId are required');
    }
    const userId = BigInt(req.user?.id || 0);
    if (!userId) {
      throw new BadRequestException('User not found');
    }
    return this.documentService.getUploadedDocuments({
      submissionId: Number(query.submissionId),
      serviceId: query.serviceId,
      userId,
    });
  }

  @Post('upload')
  @UseGuards(JwtGuard)
  @SkipResourceCheck()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const uid = (req as any).user?.investorProfileUid;
          if (!uid) {
            return cb(new BadRequestException('Investor UID not found'), '');
          }
          const dir = join(process.cwd(), 'uploads', 'investorDocuments', uid);
          if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
          }
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const uniqueName = Date.now() + extname(file.originalname);
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadChecklistDocument(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body() body: DocumentUploadDto,
  ) {
    if (!file) {
      throw new BadRequestException('File upload failed');
    }
    const submissionId = Number(body.submissionId);
    const documentMasterId = Number(body.documentMasterId);
    const serviceId = String(body.serviceId || '');
    if (!submissionId || !documentMasterId) {
      throw new BadRequestException(
        'submissionId and documentMasterId are required',
      );
    }

    const userId = BigInt(req.user?.id || 0);
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    const uploadType = body.uploadType === 'duplicate' ? 'duplicate' : 'new';
    const ipAddress =
      req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const result = await this.documentService.uploadSupportingDocument({
      submissionId,
      documentMasterId,
      uploadType,
      comments: body.comments || '',
      validFrom: body.validFrom || '',
      validTo: body.validTo || '',
      docDateOfIssuance: body.docDateOfIssuance || '',
      isDocumentActive: body.isDocumentActive || 'Y',
      filePath: file.path,
      fileName: file.filename,
      originalName: file.originalname,
      userId,
      ipAddress,
      userAgent,
      serviceId,
    });

    const uid = req.user?.investorProfileUid;
    if (!uid) {
      throw new BadRequestException('Investor UID not found');
    }

    const finalName = result.documentName;
    const finalPath = join(
      process.cwd(),
      'uploads',
      'investorDocuments',
      uid,
      finalName,
    );
    if (file.path !== finalPath) {
      renameSync(file.path, finalPath);
    }

    const relativePath = `uploads/investorDocuments/${uid}/${finalName}`;

    return {
      success: true,
      data: {
        documentsId: result.documentsId,
        checklistId: result.checklistId,
        fileName: finalName,
        filePath: relativePath,
        docRefNumber: result.docRefNumber,
        versionType: result.versionType,
        version: result.version,
      },
    };
  }

  @Post('sync')
  @UseGuards(JwtGuard)
  @SkipResourceCheck()
  async syncDocuments(@Req() req: any, @Body() body: DocumentSyncDto) {
    const submissionId = Number(body.submissionId);
    const serviceId = String(body.serviceId || '');
    const deptId = Number(body.deptId || 0);
    if (!submissionId || !serviceId) {
      throw new BadRequestException('submissionId and serviceId are required');
    }
    const userId = BigInt(req.user?.id || 0);
    if (!userId) {
      throw new BadRequestException('User not found');
    }

    await this.documentService.syncDocumentMappings({
      submissionId,
      userId,
      serviceId,
      deptId,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    return { success: true };
  }
}
