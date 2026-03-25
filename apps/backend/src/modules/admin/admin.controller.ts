import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { Resource } from '../../common/resource.decorator';
import { AdminService } from '../admin/admin.service';
import { ResponseHelper } from '../../common/response.helper';

@Controller('admin')
@UseGuards(JwtGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Resource('MASTER_ALL')
  @Get('users')
  async getUsers() {
    const users = await this.adminService.getUsers();
    return ResponseHelper.success('Users fetched successfully', users);
  }

  @Resource('MASTER_ALL')
  @Post('users')
  async createUser(@Body() body: any) {
    const user = await this.adminService.createUser(body);
    return ResponseHelper.success('User created successfully', user);
  }

  @Resource('MASTER_ALL')
  @Put('users/:id')
  async updateUser(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    const user = await this.adminService.updateUser(id, body);
    return ResponseHelper.success('User updated successfully', user);
  }

  @Resource('MASTER_ALL')
  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
    return ResponseHelper.success('User deleted successfully', null);
  }

  @Resource('MASTER_ALL')
  @Get('roles')
  async getRoles() {
    const roles = await this.adminService.getRoles();
    return ResponseHelper.success('Roles fetched successfully', roles);
  }

  @Resource('MASTER_ALL')
  @Get('permissions')
  async getPermissions() {
    const permissions = await this.adminService.getPermissions();
    return ResponseHelper.success(
      'Permissions fetched successfully',
      permissions,
    );
  }
}
