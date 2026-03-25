
import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaClient } from '@prisma/client';
import { Resource } from '../../common/resource.decorator';

// Version-proof types derived from client methods
type RolesCreateData = Parameters<PrismaClient['roles']['create']>[0] extends { data: infer D } ? D : never;
type RolesUpdateData = Parameters<PrismaClient['roles']['update']>[0] extends { data: infer D } ? D : never;

@Controller('roles')
@Resource('MASTER_ROLES')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  create(@Body() createRoleDto: RolesCreateData) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoleDto: RolesUpdateData) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }
}
