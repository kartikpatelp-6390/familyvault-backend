import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SuperadminService } from '../superadmin/superadmin.service';
import { TenantConnectionManager } from '../common/tenant-connection.manager';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { TenantUserSchema } from './schemas/user.schema';
import { FamilyMemberSchema } from '../family-member/schemas/family-member.schema';
import { RoleSchema } from '../roles/schemas/role.schema';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/interfaces/role.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private superadminService: SuperadminService,
    private tenantConnMgr: TenantConnectionManager,
  ) {}

  async validateUserByTenant(tenantId: string, usernameOrEmail: string, password: string) {
    const tenant = await this.superadminService.findByTenantId(tenantId);
    if (!tenant) throw new UnauthorizedException('Invalid tenant ID');

    const conn = await this.tenantConnMgr.getOrCreateConnection(tenantId);
    const UserModel = conn.model('User', TenantUserSchema, 'users');

    const user = await UserModel.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    }).lean().exec();

    if (user) {
      if (!user.passwordHash) throw new UnauthorizedException('User record invalid');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) throw new UnauthorizedException('Invalid username or password');

      return {
        _id: user._id.toString(),
        username: user.username,
        email: user.email,
        roles: user.roles || [],
        tenantId,
        role: 'admin',
      };
    }

    const FamilyMemberModel = conn.model('FamilyMember', FamilyMemberSchema, 'family_members');
    const member = await FamilyMemberModel.findOne({ email: usernameOrEmail }).lean();

    if (!member) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (member.passwordHash) {
      const isValid = await bcrypt.compare(password, member.passwordHash);
      if (!isValid) throw new UnauthorizedException('Invalid password');
    } else {
      // Optional fallback rules (DOB or contact)
      const dobStr = member.dateOfBirth
        ? new Date(member.dateOfBirth).toISOString().slice(0, 10).replace(/-/g, '')
        : null;

      const isValid =
        (dobStr && password === dobStr) ||
        (member.contactNumber && password === member.contactNumber);

      if (!isValid) throw new UnauthorizedException('Invalid password');
    }

    return {
      _id: member._id.toString(),
      name: member.name,
      email: member.email,
      relation: member.relation,
      tenantId,
      role: 'member',
    };
  }

  async login(payload: { tenantId: string; usernameOrEmail: string; password: string }) {
    const user = await this.validateUserByTenant(
      payload.tenantId,
      payload.usernameOrEmail,
      payload.password,
    );

    const conn = await this.tenantConnMgr.getOrCreateConnection(payload.tenantId);

    if (!conn.models.Role) {
      conn.model('Role', RoleSchema, 'roles');
    }

    const roleDoc = await conn
      .model('Role')
      .findOne({ name: user.role, is_active: true })
      .lean() as Role | null;

    const permissions = roleDoc?.permissions || [];

    const jwtPayload =
      user.role === 'admin'
        ? {
          sub: user._id,
          username: user.username,
          email: user.email,
          tenantId: user.tenantId,
          roles: user.roles,
          role: user.role,
          permissions,
        }
        : {
          sub: user._id,
          name: user.name,
          email: user.email,
          tenantId: user.tenantId,
          relation: user.relation,
          role: user.role,
          permissions,
        };

    const token = await this.jwtService.signAsync(jwtPayload);

    return {
      message: `Login successful as ${user.role}`,
      accessToken: token,
      user,
    };
  }
}
