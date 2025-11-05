import { Module } from '@nestjs/common';
import { BankAccountController } from './bank-account.controller';
import { BankAccountService } from './bank-account.service';
import { CommonModule } from '../common/common.module';
import { GuardsModule } from '../common/guards/guards.module';
import { MemberSharedAccessModule } from '../member-shared-access/member-shared-access.module';

@Module({
  imports: [CommonModule, GuardsModule, MemberSharedAccessModule],
  controllers: [BankAccountController],
  providers: [BankAccountService],
  exports: [BankAccountService],
})
export class BankAccountModule {}
