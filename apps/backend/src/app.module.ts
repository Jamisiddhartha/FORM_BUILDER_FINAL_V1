import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SysMiddleware } from './sys.bootstrap';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { MasterModule } from './modules/master/master.module';
import { UploadModule } from './modules/upload/upload.module';
import { InvestorDocumentModule } from './modules/investor/document/investor-document.module';
import { SsoModule } from './modules/sso/sso.module';
import { KyaModule } from './modules/kya/kya.module';
import { RolesResourcesGuard } from './common/roles-resources.guard';
import { JwtGuard } from './modules/auth/guards/jwt.guard';
import { KnowYourIncentiveModule } from './modules/knowYourIncentive/know-your-incentive.module';
import { IncentiveCalculatorModule } from './modules/incentiveCalculator/incentive-calculator.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { InformationWizardModule } from './modules/informationwizard/information-wizard.module';
import { InprincipleModule } from './modules/investor/inprinciple/inprinciple.module';
import { WorkflowConfigModule } from './modules/admin/workflow-config/workflow-config.module';
import { CommonDocumentModule } from './modules/common/document/document.module';
import { ProjectStatusUpdateModule } from './modules/investor/projectStatusUpdate/project-status-update.module';
import { UnifiedApplicationModule } from './modules/investor/unifiedApplication/unified-application.module';
import { WorkflowRuntimeModule } from './modules/workflow-runtime/workflow-runtime.module';
import { InvestorServicesModule } from './modules/investor/services/investor-services.module';
import { FbDashboardModule } from './modules/fb-dashboard/fb-dashboard.module';

// root-alias candidates
import { DocumentTypeModule } from './modules/master/documentType/document-type.module';
import { DocumentTypeRootModule } from './modules/master/documentType/document-type.root.module'; 
import { FormTypeModule } from './modules/master/formType/form-type.module';
import { CommonIncentiveModule } from './modules/commonIncentive/common-incentive.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    RouterModule.register([
      {
        path: 'master',
        children: [
          { path: '', module: MasterModule },       // mounts the rest of /master
          { path: '', module: DocumentTypeModule }, // /master/document-types
          { path: '', module: FormTypeModule },     // /master/form-types (and aliases)
        ],
      },
      // root alias → /document-types
      { path: '', module: DocumentTypeRootModule },
    ]),

    // --- DI imports (must instantiate modules used by the router) ---
    PrismaModule,
    AuthModule,
    AdminModule,
    RbacModule,

    MasterModule,

    // 🔴 ADD THIS (was missing): ensures controllers/providers are instantiated
    DocumentTypeModule,
    DocumentTypeRootModule,

    UploadModule,
    InvestorDocumentModule,
    SsoModule,
    KnowYourIncentiveModule,
    IncentiveCalculatorModule,
    KyaModule,
    InspectionsModule,
    InformationWizardModule,
    InprincipleModule,
    WorkflowConfigModule,
    CommonIncentiveModule,
    CommonDocumentModule,
    ProjectStatusUpdateModule,
    UnifiedApplicationModule,
    WorkflowRuntimeModule,
    InvestorServicesModule,
    FbDashboardModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesResourcesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SysMiddleware).forRoutes('*');
  }
}
