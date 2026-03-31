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
} from './dto';
import { MasterDataManagementService } from './master-data-management.service';

@Controller('master/master-data-management')
@UseGuards(JwtGuard, RolesResourcesGuard)
@Resource('MASTER_ALL')
export class MasterDataManagementController {
  constructor(private readonly service: MasterDataManagementService) {}

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

  @Put('projects/:id/toggle')
  async toggleProject(@Param('id') id: string) {
    return this.service.toggleProject(parseInt(id, 10));
  }

  @Get('sub-departments')
  async getSubDepartments(@Query('departmentId') departmentId?: string) {
    return this.service.getSubDepartments(
      departmentId ? parseInt(departmentId, 10) : undefined,
    );
  }

  @Post('sub-departments')
  async createSubDepartment(@Body() dto: CreateSubDepartmentDto) {
    return this.service.createSubDepartment(dto);
  }

  @Put('sub-departments/:id')
  async updateSubDepartment(
    @Param('id') id: string,
    @Body() dto: UpdateSubDepartmentDto,
  ) {
    return this.service.updateSubDepartment(parseInt(id, 10), dto);
  }

  @Put('sub-departments/:id/toggle')
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

  @Get('definitions/:id')
  async getDefinition(@Param('id') id: string) {
    return this.service.getDefinition(parseInt(id, 10));
  }

  @Post('definitions')
  async createDefinition(
    @Body() dto: CreateMasterDataDefinitionDto,
    @Req() req: any,
  ) {
    return this.service.createDefinition(dto, String(req.user?.id || 'system'));
  }

  @Put('definitions/:id')
  async updateDefinition(
    @Param('id') id: string,
    @Body() dto: UpdateMasterDataDefinitionDto,
  ) {
    return this.service.updateDefinition(parseInt(id, 10), dto);
  }

  @Put('definitions/:id/toggle')
  async toggleDefinition(@Param('id') id: string) {
    return this.service.toggleDefinition(parseInt(id, 10));
  }

  @Delete('definitions/:id')
  async deleteDefinition(@Param('id') id: string) {
    return this.service.deleteDefinition(parseInt(id, 10));
  }

  @Get('definitions/:id/records')
  async getRecords(@Param('id') id: string) {
    return this.service.getRecords(parseInt(id, 10));
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
}
