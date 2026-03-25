
import { Module } from '@nestjs/common';
import { SsoController } from './sso.controller';
import { DeptWebhookController } from './dept-webhook.controller';
import { MockController } from './mock.controller';
import { SsoService } from './sso.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  imports: [],
  controllers: [SsoController, DeptWebhookController, MockController],
  providers: [SsoService, PrismaService],
})
export class SsoModule {}
