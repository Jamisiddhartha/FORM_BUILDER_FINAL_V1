import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateFormTypeDto, UpdateFormTypeDto } from './dto';
import { FormTypeService } from './form-type.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesResourcesGuard } from '../../../common/roles-resources.guard';
import { Resource } from '../../../common/resource.decorator';

// Expose 3 equivalent paths to avoid 404s caused by spelling differences
@Controller(['form-types', 'form-type', 'formtype'])
@UseGuards(JwtGuard, RolesResourcesGuard)
@Resource('MASTER_ALL')
export class FormTypeController {
  constructor(private readonly formTypeService: FormTypeService) {}

  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;

    return this.formTypeService.findAll(filters);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.formTypeService.findOne(id);
  }

  @Post()
  async create(@Body() data: CreateFormTypeDto) {
    return this.formTypeService.create(data);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateFormTypeDto,
  ) {
    return this.formTypeService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.formTypeService.delete(id);
  }

  @Patch(':id/toggle')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.formTypeService.toggle(id);
  }
}
