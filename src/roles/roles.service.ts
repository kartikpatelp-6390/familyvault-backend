import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { RoleSchema } from './schemas/role.schema';
import { ModuleSchema } from '../superadmin/schemas/module.schema';

@Injectable()
export class RolesService {
  private getModel(conn: mongoose.Connection) {
    return conn.model('Role', RoleSchema, 'roles');
  }

  async createRole(conn: mongoose.Connection, dto: any) {
    const Role = this.getModel(conn);
    const existing = await Role.findOne({ name: dto.name });
    if (existing) throw new ConflictException('Role name already exists');
    const role = await Role.create(dto);
    return { message: 'Role created successfully', role };
  }

  async listRoles(conn: mongoose.Connection) {
    const Role = this.getModel(conn);
    return Role.find().sort({ createdAt: -1 }).lean();
  }

  async updateRole(conn: mongoose.Connection, id: string, dto: any) {
    const Role = this.getModel(conn);
    const role = await Role.findByIdAndUpdate(id, dto, { new: true });
    if (!role) throw new NotFoundException('Role not found');
    return { message: 'Role updated successfully', role };
  }

  async deactivateRole(conn: mongoose.Connection, id: string) {
    const Role = this.getModel(conn);
    const role = await Role.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    role.is_active = false;
    await role.save();

    return { message: `Role '${role.name}' deactivated successfully`, role };
  }

  private getRoleModel(conn: mongoose.Connection) {
    return conn.model('Role', RoleSchema, 'roles');
  }

  private getModuleModel(conn: mongoose.Connection) {
    return conn.model('Module', ModuleSchema, 'modules');
  }

  async getRoleRules(conn: mongoose.Connection) {
    const Role = this.getRoleModel(conn);
    const Module = this.getModuleModel(conn);

    const [role, modules] = await Promise.all([
      Role.findOne({ name: 'admin' }).lean(),
      Module.find({ is_active: true }).lean(),
    ]);

    const rules = modules.map((mod) => {
      const existing = role?.permissions?.find((p) => p.module_key === mod.module_key);
      return {
        module_name: mod.module_name,
        module_key: mod.module_key,
        actions: {
          create: existing?.actions.includes('create') || false,
          read: existing?.actions.includes('read') || false,
          update: existing?.actions.includes('update') || false,
          delete: existing?.actions.includes('delete') || false,
        },
      };
    });

    return { role: role?.name || 'admin', rules };
  }

  async updateRoleRules(conn: mongoose.Connection, body: any) {
    const Role = this.getRoleModel(conn);

    const formattedPermissions = body.rules.map((r) => ({
      module_key: r.module_key,
      actions: Object.entries(r.actions)
        .filter(([_, enabled]) => enabled)
        .map(([action]) => action),
    }));

    await Role.updateOne(
      { name: 'Admin' },
      { $set: { permissions: formattedPermissions } },
      { upsert: true },
    );

    return { message: 'Rules updated successfully.' };
  }

  // Get all active roles for this tenant (Admin only)
  async getAllActiveRoles(conn: mongoose.Connection) {
    const Role = this.getRoleModel(conn);
    const roles = await Role.find({ is_active: true }).lean();

    // Format permissions for clarity
    const formattedRoles = roles.map((r) => ({
      role_name: r.name,
      permissions: (r.permissions || []).map((p) => ({
        module_key: p.module_key,
        actions: p.actions,
      })),
    }));

    return formattedRoles;
  }
}