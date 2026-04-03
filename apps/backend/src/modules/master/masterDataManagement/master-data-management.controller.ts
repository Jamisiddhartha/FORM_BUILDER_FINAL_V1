import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Resource } from '../../../common/resource.decorator';
import { RolesResourcesGuard } from '../../../common/roles-resources.guard';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import {
  CreateMasterDataDefinitionDto,
  CreateMasterDataProjectDto,
  CreateMasterDataRecordDto,
  CreateSubDepartmentDto,
  UpdateMasterDataDefinitionDto,
  UpdateMasterDataProjectDto,
  UpdateMasterDataRecordDto,
  UpdateSubDepartmentDto,
  CreateMasterDefinitionV2Dto,
  UpdateMasterDefinitionV2Dto,
  CreateMasterColumnDefinitionDto,
  UpdateMasterColumnDefinitionDto,
  CreateMasterDataDto,
  UpdateMasterDataDto,
  CreateMasterDataReferenceDto,
} from './dto';
import { MasterDataManagementService } from './master-data-management.service';

@Controller('master/master-data-management')
@UseGuards(JwtGuard, RolesResourcesGuard)
@Resource('MASTER_ALL')
export class MasterDataManagementController {
  constructor(private readonly service: MasterDataManagementService) {}

  // ========== EXISTING ENDPOINTS (V1) ==========

  @Get('projects')
  async getProjects() {
    return this.service.getProjects();
  }

  @Post('projects')
  async createProject(@Body() dto: CreateMasterDataProjectDto, @Req() req: any) {
    return this.service.createProject(dto, String(req.user?.id || 'system'));
  }

  @Put('projects/:id')
  async updateProject(@Param('id') id: string, @Body() dto: UpdateMasterDataProjectDto) {
    return this.service.updateProject(parseInt(id, 10), dto);
  }

  @Post('projects/:id/toggle')
  async toggleProject(@Param('id') id: string) {
    return this.service.toggleProject(parseInt(id, 10));
  }

  @Get('sub-departments')
  async getSubDepartments(@Query('departmentId') departmentId?: string) {
    return this.service.getSubDepartments(departmentId ? parseInt(departmentId, 10) : undefined);
  }

  @Post('sub-departments')
  async createSubDepartment(@Body() dto: CreateSubDepartmentDto) {
    return this.service.createSubDepartment(dto);
  }

  @Put('sub-departments/:id')
  async updateSubDepartment(@Param('id') id: string, @Body() dto: UpdateSubDepartmentDto) {
    return this.service.updateSubDepartment(parseInt(id, 10), dto);
  }

  @Post('sub-departments/:id/toggle')
  async toggleSubDepartment(@Param('id') id: string) {
    return this.service.toggleSubDepartment(parseInt(id, 10));
  }

  @Get('definitions')
  async getDefinitions(
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.getDefinitions({
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      search,
    });
  }

  @Post('definitions')
  async createDefinition(@Body() dto: CreateMasterDataDefinitionDto, @Req() req: any) {
    return this.service.createDefinition(dto, String(req.user?.id || 'system'));
  }

  @Get('definitions/:id')
  async getDefinition(@Param('id') id: string) {
    return this.service.getDefinition(parseInt(id, 10));
  }

  @Put('definitions/:id')
  async updateDefinition(@Param('id') id: string, @Body() dto: UpdateMasterDataDefinitionDto) {
    return this.service.updateDefinition(parseInt(id, 10), dto);
  }

  @Delete('definitions/:id')
  async deleteDefinition(@Param('id') id: string) {
    return this.service.deleteDefinition(parseInt(id, 10));
  }

  @Post('definitions/:id/toggle')
  async toggleDefinition(@Param('id') id: string) {
    return this.service.toggleDefinition(parseInt(id, 10));
  }

  @Post('definitions/:id/records')
  async createRecord(@Param('id') id: string, @Body() dto: CreateMasterDataRecordDto) {
    return this.service.createRecord(parseInt(id, 10), dto);
  }

  @Put('definitions/:id/records/:recordId')
  async updateRecord(
    @Param('id') id: string,
    @Param('recordId') recordId: string,
    @Body() dto: UpdateMasterDataRecordDto,
  ) {
    return this.service.updateRecord(parseInt(id, 10), parseInt(recordId, 10), dto);
  }

  @Delete('definitions/:id/records/:recordId')
  async deleteRecord(@Param('id') id: string, @Param('recordId') recordId: string) {
    return this.service.deleteRecord(parseInt(id, 10), parseInt(recordId, 10));
  }

  @Post('definitions/:id/upload-csv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCsv(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.service.uploadCsv(
      parseInt(id, 10),
      file,
      String(req.user?.id || 'system'),
    );
  }

  // ========== MASTER DATA MANAGEMENT V2 ENDPOINTS ==========

  @Get('v2/tenants')
  async getTenantsV2() {
    return this.service.getTenants();
  }

  @Get('v2/projects')
  async getTenantProjectsV2(@Query('tenantId') tenantId?: string) {
    return this.service.getTenantProjects(tenantId ? parseInt(tenantId, 10) : undefined);
  }

  @Post('v2/definitions')
  async createMasterDefinitionV2(@Body() dto: CreateMasterDefinitionV2Dto, @Req() req: any) {
    return this.service.createMasterDefinitionV2(dto, String(req.user?.id || 'system'));
  }

  @Get('v2/definitions')
  async getMasterDefinitionsV2(
    @Query('tenantId') tenantId?: string,
    @Query('projectId') projectId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.getMasterDefinitionsV2({
      tenantId: tenantId ? parseInt(tenantId, 10) : undefined,
      projectId: projectId ? parseInt(projectId, 10) : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('v2/definitions/:id')
  async getMasterDefinitionV2(@Param('id') id: string) {
    return this.service.getMasterDefinitionV2(parseInt(id, 10));
  }

  @Put('v2/definitions/:id')
  async updateMasterDefinitionV2(@Param('id') id: string, @Body() dto: UpdateMasterDefinitionV2Dto) {
    return this.service.updateMasterDefinitionV2(parseInt(id, 10), dto);
  }

  @Delete('v2/definitions/:id')
  async deleteMasterDefinitionV2(@Param('id') id: string) {
    return this.service.deleteMasterDefinitionV2(parseInt(id, 10));
  }

  @Post('v2/definitions/:id/columns')
  async createMasterColumnDefinitionsV2(
    @Param('id') id: string,
    @Body() dtos: CreateMasterColumnDefinitionDto[],
  ) {
    return this.service.createMasterColumnDefinitionsV2(parseInt(id, 10), dtos);
  }

  @Get('v2/definitions/:id/columns')
  async getMasterColumnDefinitionsV2(@Param('id') id: string) {
    return this.service.getMasterColumnDefinitionsV2(parseInt(id, 10));
  }

  @Put('v2/columns/:columnId')
  async updateMasterColumnDefinitionV2(
    @Param('columnId') columnId: string,
    @Body() dto: UpdateMasterColumnDefinitionDto,
  ) {
    return this.service.updateMasterColumnDefinitionV2(parseInt(columnId, 10), dto);
  }

  @Delete('v2/columns/:columnId')
  async deleteMasterColumnDefinitionV2(@Param('columnId') columnId: string) {
    return this.service.deleteMasterColumnDefinitionV2(parseInt(columnId, 10));
  }

  @Post('v2/data')
  async createMasterDataV2(@Body() dto: CreateMasterDataDto, @Req() req: any) {
    return this.service.createMasterDataV2({ ...dto, createdBy: String(req.user?.id || 'system') });
  }

  @Get('v2/masters/:masterId/data')
  async getMasterDataV2(
    @Param('masterId') masterId: string,
    @Query('tenantId') tenantId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.getMasterDataV2(parseInt(masterId, 10), {
      tenantId: tenantId ? parseInt(tenantId, 10) : undefined,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Get('v2/data/:id')
  async getMasterDataEntryV2(@Param('id') id: string) {
    return this.service.getMasterDataEntryV2(BigInt(id));
  }

  @Put('v2/data/:id')
  async updateMasterDataV2(@Param('id') id: string, @Body() dto: UpdateMasterDataDto, @Req() req: any) {
    return this.service.updateMasterDataV2(BigInt(id), {
      ...dto,
      updatedBy: String(req.user?.id || 'system'),
    });
  }

  @Delete('v2/data/:id')
  async deleteMasterDataV2(@Param('id') id: string) {
    return this.service.deleteMasterDataV2(BigInt(id));
  }

  @Post('v2/references')
  async createMasterDataReferenceV2(@Body() dto: CreateMasterDataReferenceDto) {
    return this.service.createMasterDataReferenceV2(dto);
  }

  @Get('v2/data/:id/references')
  async getMasterDataReferencesV2(@Param('id') id: string) {
    return this.service.getMasterDataReferencesV2(BigInt(id));
  }

  @Delete('v2/references/:id')
  async deleteMasterDataReferenceV2(@Param('id') id: string) {
    return this.service.deleteMasterDataReferenceV2(BigInt(id));
  }

  @Post('v2/masters/:masterId/import-csv')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async importMasterDataCsvV2(
    @Param('masterId') masterId: string,
    @Query('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    const csv = require('csv-parse/sync');
    const content = file.buffer.toString('utf-8');
    const records = csv.parse(content, {
      columns: true,
      skip_empty_lines: true,
    });

    return this.service.importMasterDataFromCsvV2(
      parseInt(masterId, 10),
      parseInt(tenantId, 10),
      records,
      String(req.user?.id || 'system'),
    );
  }
}
