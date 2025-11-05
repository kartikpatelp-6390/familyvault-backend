import { Module } from '@nestjs/common';
import { AccessGuard } from './access.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MemberSharedAccessModule } from '../../member-shared-access/member-shared-access.module';

@Module({
  imports: [
    MemberSharedAccessModule, // ✅ Provides MemberSharedAccessService
  ],
  providers: [
    AccessGuard,
    JwtAuthGuard, // Optional — include if you want to reuse globally
  ],
  exports: [
    AccessGuard,
    JwtAuthGuard, // ✅ So any feature module can use them
  ],
})
export class GuardsModule {}
