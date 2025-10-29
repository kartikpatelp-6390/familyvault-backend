import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req, Put } from '@nestjs/common';
import { BankAccountService } from './bank-account.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('bank-account')
@UseGuards(JwtAuthGuard)
export class BankAccountController {
  constructor(private readonly service: BankAccountService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateBankAccountDto) {
    return await this.service.create(req.tenantConn, dto, req.user.tenantId);
  }

  @Get()
  async findAll(@Req() req) {
    return this.service.findAll(req.tenantConn, req.user.tenantId);
  }

  @Get('member/:memberId')
  async findAllByMember(@Req() req, @Param('memberId') memberId: string) {
    return await this.service.findAllByMember(req.tenantConn, memberId, req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return await this.service.findOne(req.tenantConn, id, req.user.tenantId);
  }

  @Put(':id')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    return await this.service.update(req.tenantConn, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return await this.service.remove(req.tenantConn, id);
  }
}
