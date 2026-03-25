
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FormFieldService } from './form-field.service';
import { CreateFormFieldDto, UpdateFormFieldDto } from './dto';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { RolesResourcesGuard } from '../../../common/roles-resources.guard';
import { Resource } from '../../../common/resource.decorator';
import { Public } from '../../../common/public.decorator';

@Controller('master/form-fields')  // <-- matches /master/form-fields
@UseGuards(JwtGuard, RolesResourcesGuard)
@Resource('MASTER_ALL')
export class FormFieldController {
  constructor(private service: FormFieldService) {}

  @Post()
  create(@Body() data: CreateFormFieldDto) {
    return this.service.create(data);
  }

  @Public()
  @Get()
  findAll(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('parentId') parentId?: string
  ) {
    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (search) filters.search = search;
    if (parentId !== undefined) filters.parentId = parseInt(parentId);
    return this.service.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(parseInt(id));
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: UpdateFormFieldDto) {
    return this.service.update(parseInt(id), data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(parseInt(id));
  }

  @Put(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(parseInt(id));
  }
}
