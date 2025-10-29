import { Module } from "@nestjs/common";
import { TenantConnectionManager } from './tenant-connection.manager';

@Module({
  providers: [TenantConnectionManager],
  exports: [TenantConnectionManager],
})
export class CommonModule {}