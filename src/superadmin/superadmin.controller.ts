import { Controller, Post, Get, Body, Param, Req, ForbiddenException } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Controller('superadmin')
export class SuperadminController {
  constructor(
    private readonly svc: SuperadminService,
    @InjectConnection() private readonly conn: mongoose.Connection,
  ) {}

  @Post('tenants')
  async createTenant(@Body() body: CreateTenantDto) {
    return this.svc.createTenant(body);
  }

  // Create new global module
  @Post('modules')
  async createModule(@Body() body: { module_name: string; module_key: string; description?: string }) {
    return this.svc.createModule(this.conn, body);
  }

  // List all modules
  @Get('modules')
  async listModules() {
    return this.svc.listModules(this.conn);
  }

  // Assign or unassign a module to a tenant
  @Post('modules/:tenantId/assign')
  async assignModule(
    @Param('tenantId') tenantId: string,
    @Body() body: { module_key: string; is_active: boolean },
  ) {
    return this.svc.assignModuleToTenant(this.conn, tenantId, body);
  }

  // List tenant’s assigned modules
  @Get('modules/:tenantId')
  async getTenantModules(@Param('tenantId') tenantId: string) {
    return this.svc.getTenantModules(this.conn, tenantId);
  }

  @Get('modules/active')
  async getActiveModule(@Req() req) {
    const user = req.user;
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only Admins can access roles.');
    }

    return this.svc.getActiveModules(req.tenantConn);
  }

}
