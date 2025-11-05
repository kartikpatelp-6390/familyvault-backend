import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberSharedAccessService } from '../../member-shared-access/member-shared-access.service';

/**
 * AccessGuard — replaces RolesGuard.
 * Supports only "member" type users.
 *
 * Logic:
 * 1. If user is the resource owner → allow
 * 2. Else check sharing (via MemberSharedAccessService)
 * 3. Else deny
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly sharedSvc: MemberSharedAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions =
      this.reflector.get<{ module_key: string; action: string }[]>(
        'permissions',
        context.getHandler(),
      ) || [];

    // No @Permissions decorator → allow
    if (!permissions.length) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user || !user.memberId)
      throw new ForbiddenException('Unauthorized access');

    // We only handle one permission per endpoint typically
    const { module_key: moduleKey, action } = permissions[0];

    // Identify ownerMemberId (target member whose data is being accessed)
    const ownerMemberId =
      req.params?.memberId ||
      req.params?.ownerMemberId ||
      req.body?.ownerMemberId ||
      null;

    if (!ownerMemberId) {
      throw new ForbiddenException(
        `Access denied: owner member ID not provided.`,
      );
    }

    // ✅ Allow if accessing own data
    if (String(user.memberId) === String(ownerMemberId)) return true;

    // ✅ Otherwise check sharing access
    const { allowed } = await this.sharedSvc.checkAccess(
      req.tenantConn,
      ownerMemberId,
      user.memberId,
      moduleKey,
      action as 'read' | 'update' | 'delete',
      null, // for resource-level checks, service handles inside module services
    );

    if (!allowed)
      throw new ForbiddenException(
        `Access denied: ${moduleKey} not shared by ${ownerMemberId}`,
      );

    return true;
  }
}
4