import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tenant, TenantSchema } from './schemas/tenant.schema';
import { SuperadminService } from './superadmin.service';
import { SuperadminController } from './superadmin.controller';
import { TenantConnectionManager } from '../common/tenant-connection.manager';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tenant.name, schema: TenantSchema }]),
  ],
  controllers: [SuperadminController],
  providers: [SuperadminService, TenantConnectionManager],
  exports: [SuperadminService, TenantConnectionManager],
})
export class SuperadminModule {}
