import { Module } from '@nestjs/common';
import { MemberSharedAccessService } from './member-shared-access.service';
import { MemberSharedAccessController } from './member-shared-access.controller';

@Module({
  controllers: [MemberSharedAccessController],
  providers: [MemberSharedAccessService],
  exports: [MemberSharedAccessService],
})
export class MemberSharedAccessModule {}
