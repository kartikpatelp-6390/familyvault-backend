import { Controller, Post, Get, Put, Delete, Patch, Body, Param, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Create new role
  @Post()
  async createRole(@Req() req, @Body() body: any) {
    return this.rolesService.createRole(req.tenantConn, body);
  }

  // List all roles
  @Get()
  async listRoles(@Req() req) {
    return this.rolesService.listRoles(req.tenantConn);
  }

  // Update role
  @Put(':id')
  async updateRole(@Req() req, @Param('id') id: string, @Body() body: any) {
    return this.rolesService.updateRole(req.tenantConn, id, body);
  }

  // Delete role
  @Delete(':id/deactivateRole')
  async deactivateRole(@Req() req, @Param('id') id: string) {
    return this.rolesService.deactivateRole(req.tenantConn, id);
  }

  @Patch(':id/activate')
  async activateRole(@Req() req, @Param('id') id: string) {
    return this.rolesService.updateRole(req.tenantConn, id, { is_active: true });
  }

  @Get('rules')
  async getRoleRules(@Req() req) {
    return this.rolesService.getRoleRules(req.tenantConn);
  }

  @Put('rules')
  async updateRoleRules(@Req() req, @Body() body: any) {
    return this.rolesService.updateRoleRules(req.tenantConn, body);
  }

  @Get('active')
  async getAllActiveRoles(@Req() req) {
    const user = req.user;

    // Check if current user is Admin
    if (user?.role !== 'admin') {
      throw new ForbiddenException('Only Admins can access roles.');
    }

    return this.rolesService.getAllActiveRoles(req.tenantConn);
  }
}