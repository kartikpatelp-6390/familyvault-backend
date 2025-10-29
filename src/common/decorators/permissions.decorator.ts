import { SetMetadata } from '@nestjs/common';

export interface PermissionRequirement {
  module_key: string;
  action: string;
}

/**
 * Usage:
 * @Permissions({ module_key: 'documents', action: 'delete' })
 */
export const Permissions = (...permissions: PermissionRequirement[]) =>
  SetMetadata('permissions', permissions);
