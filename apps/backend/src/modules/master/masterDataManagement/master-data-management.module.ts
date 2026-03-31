import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { MasterDataManagementController } from './master-data-management.controller';
import { MasterDataManagementService } from './master-data-management.service';

@Module({
  imports: [PrismaModule],
  controllers: [MasterDataManagementController],
  providers: [MasterDataManagementService],
  exports: [MasterDataManagementService],
})
export class MasterDataManagementModule {}
