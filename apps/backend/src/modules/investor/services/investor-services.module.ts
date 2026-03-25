import { Module } from '@nestjs/common';
import { InvestorServicesService } from './investor-services.service';
import { InvestorServicesController } from './investor-services.controller';
import { PrismaService } from '../../database/prisma.service';
import { CommonDocumentModule } from '../../common/document/document.module';

@Module({
  imports: [CommonDocumentModule],
  controllers: [InvestorServicesController],
  providers: [InvestorServicesService, PrismaService],
})
export class InvestorServicesModule {}
