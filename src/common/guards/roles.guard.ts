import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionRequirement } from '../decorators/permissions.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.get<PermissionRequirement[]>('permissions', context.getHandler());
    if (!requiredPermissions) return true; // No permissions specified → public route

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.role == "admin") {
      return true;
    }

    // If no permissions found in JWT
    if (!user?.permissions) {
      throw new ForbiddenException('No permissions assigned to your role.');
    }

    // Check if user has all required permissions
    const hasPermission = requiredPermissions.every((required) =>
      user.permissions.some(
        (perm) =>
          perm.module_key === required.module_key &&
          perm.actions.includes(required.action),
      ),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Access denied. You do not have permission for this action.');
    }

    return true;
  }
}
