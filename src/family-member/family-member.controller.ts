import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { FamilyMemberService } from './family-member.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';

@Controller('family-member')
@UseGuards(JwtAuthGuard)
export class FamilyMemberController {
  constructor(private readonly familyMemberService: FamilyMemberService) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateFamilyMemberDto) {
    return this.familyMemberService.create(req.tenantConn, dto);
  }

  @Get()
  async findAll(@Req() req) {
    return this.familyMemberService.findAll(req.tenantConn, req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Req() req, @Param('id') id: string) {
    return this.familyMemberService.findOne(req.tenantConn, id, req.user.tenantId);
  }

  @Put(':id')
  async update(@Req() req, @Param('id') id: string, @Body() dto: UpdateFamilyMemberDto) {
    return this.familyMemberService.update(req.tenantConn, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req, @Param('id') id: string) {
    return this.familyMemberService.remove(req.tenantConn, id);
  }
}
