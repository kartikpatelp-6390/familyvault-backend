import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { Tenant, TenantDocument, TenantSchema } from './schemas/tenant.schema';
import { randomSixDigit } from '../utils/random';
import * as bcrypt from 'bcrypt';
import { TenantConnectionManager } from '../common/tenant-connection.manager';
import { ModuleSchema } from './schemas/module.schema';
import { ClientModuleSchema } from './schemas/client-module.schema';

// We will import tenant user schema from auth module file to keep schemas separate.
// But for seeding, create a minimal schema here referencing the tenant user schema shape.
import { TenantUserSchema } from '../auth/schemas/user.schema';

@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private tenantConnMgr: TenantConnectionManager,
  ) {}

  async createTenant({ email, username, password, displayName }: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) {
    const existing = await this.tenantModel.findOne({ email }).lean().exec();
    if (existing) throw new BadRequestException('Email already exists');

    let tenantId = randomSixDigit();
    while (await this.tenantModel.findOne({ tenantId })) {
      tenantId = randomSixDigit();
    }

    const tenant = await this.tenantModel.create({
      tenantId,
      email,
      displayName: displayName || username,
      modules: ['family', 'investment', 'loan', 'insurance', 'documents'],
    });

    // Create tenant DB connection and seed admin user
    const conn = await this.tenantConnMgr.getOrCreateConnection(tenantId);
    const UserModel = conn.model('User', TenantUserSchema, 'users');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await UserModel.create({
      username,
      email,
      passwordHash,
      roles: ['admin'],
    });

    return { tenantId: tenant.tenantId, message: 'Tenant created successfully' };
  }

  async findByTenantId(tenantId: string) {
    return this.tenantModel.findOne({ tenantId }).lean().exec();
  }

  private getModuleModel(conn: mongoose.Connection) {
    return conn.model('Module', ModuleSchema, 'modules');
  }

  private getClientModuleModel(conn: mongoose.Connection) {
    return conn.model('ClientModule', ClientModuleSchema, 'client_modules');
  }

  private getTenantModel(conn: mongoose.Connection) {
    return conn.model('Tenant', TenantSchema, 'tenants');
  }

  // Create a new global module
  async createModule(conn: mongoose.Connection, dto: { module_name: string; module_key: string; description?: string }) {
    const Module = this.getModuleModel(conn);
    const existing = await Module.findOne({ module_key: dto.module_key });
    if (existing) throw new ConflictException('Module with this key already exists');

    const module = await Module.create(dto);
    return { message: 'Module created successfully', module };
  }

  // List all available modules
  async listModules(conn: mongoose.Connection) {
    const Module = this.getModuleModel(conn);
    return Module.find().sort({ createdAt: -1 }).lean();
  }

  // Assign or unassign a module to tenant
  async assignModuleToTenant(
    conn: mongoose.Connection,
    tenantId: string,
    dto: { module_key: string; is_active: boolean },
  ) {
    const ClientModule = this.getClientModuleModel(conn);
    const Tenant = this.getTenantModel(conn);

    const tenant = await Tenant.findOne({ tenantId: tenantId });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const existing = await ClientModule.findOne({ tenant_id: tenantId, module_key: dto.module_key });

    if (existing) {
      existing.is_active = dto.is_active;
      existing.activated_at = new Date();
      await existing.save();
      return { message: `Module ${dto.is_active ? 'activated' : 'deactivated'} for tenant`, module: existing };
    }

    const newMapping = await ClientModule.create({
      tenant_id: tenantId,
      module_key: dto.module_key,
      is_active: dto.is_active,
      activated_at: new Date(),
    });

    return { message: 'Module assigned to tenant', module: newMapping };
  }

  // Get modules assigned to a tenant
  async getTenantModules(conn: mongoose.Connection, tenantId: string) {
    const ClientModule = this.getClientModuleModel(conn);
    return ClientModule.find({ tenant_id: tenantId }).lean();
  }

  async getActiveModules(conn: mongoose.Connection) {
    const Module = this.getModuleModel(conn);
    const modules = await Module.find({ is_active: true }).lean();

    return modules.map((m) => ({
      module_key: m.module_key,
      module_name: m.module_name,
      description: m.description || '',
    }));
  }
}
