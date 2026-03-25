import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FbDashboardController } from './fb-dashboard.controller';
import { FbDashboardService } from './fb-dashboard.service';

@Module({
  controllers: [FbDashboardController],
  providers: [FbDashboardService, PrismaService],
})
export class FbDashboardModule {}
