import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MemberSharedAccessService } from './member-shared-access.service';
import { CreateShareDto } from './dto/create-share.dto';
import { RevokeShareDto } from './dto/revoke-share.dto';

interface BulkShareResult {
  moduleKey: string;
  updated: boolean;
  count: number;
}

/**
 * Controller for managing member-to-member sharing
 */
@UseGuards(JwtAuthGuard)
@Controller('member-share')
export class MemberSharedAccessController {
  constructor(private readonly sharedSvc: MemberSharedAccessService) {}

  /**
   * Create or update a share.
   * The logged-in member becomes the "owner" of the shared module/resource.
   */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateShareDto) {
    const ownerMemberId = req.user?.sub;
    if (!ownerMemberId) throw new BadRequestException('memberId not found in JWT');

    // Ensure user cannot share to themselves
    const validRecipients = dto.sharedWith.filter((r) => r.memberId !== ownerMemberId);
    if (validRecipients.length === 0) {
      throw new BadRequestException('No valid recipients provided');
    }

    return this.sharedSvc.createOrUpdateShare(
      req.tenantConn,
      ownerMemberId,
      dto.moduleKey,
      dto.resourceId ?? null,
      validRecipients.map((r) => ({
        memberId: r.memberId,
        permissions: r.permissions,
        expiresAt: r.expiresAt,
        note: r.note,
      })),
      dto.note ?? null,
    );
  }

  /**
   * List all shares created by the logged-in member
   */
  @Get('given')
  async getGivenShares(@Req() req: any) {
    const ownerMemberId = req.user?.sub;
    return this.sharedSvc.getSharesGiven(req.tenantConn, ownerMemberId);
  }

  /**
   * List all shares received by the logged-in member
   */
  @Get('received')
  async getReceivedShares(@Req() req: any) {
    const recipientMemberId = req.user?.sub;
    return this.sharedSvc.getSharesReceived(req.tenantConn, recipientMemberId);
  }

  /**
   * Revoke a shared access for a specific recipient
   * @query resourceId optional - revoke resource-level share
   */
  @Delete(':moduleKey/:targetMemberId')
  async revoke(
    @Req() req: any,
    @Param('moduleKey') moduleKey: string,
    @Param('targetMemberId') targetMemberId: string,
    @Query('resourceId') resourceId?: string,
  ) {
    const ownerMemberId = req.user?.sub;
    if (!ownerMemberId) throw new BadRequestException('memberId not found in JWT');

    return this.sharedSvc.revokeShare(
      req.tenantConn,
      ownerMemberId,
      moduleKey,
      targetMemberId,
      resourceId ?? null,
    );
  }

  @Post('bulk')
  async bulkUpdateShares(@Req() req, @Body() body: any) {
    const ownerMemberId = req.user.memberId;
    const { shares } = body;

    if (!shares || !Array.isArray(shares)) {
      throw new Error('Invalid shares payload');
    }

    const results: BulkShareResult[] = [];

    for (const share of shares) {
      const { moduleKey, sharedWith } = share;
      if (!moduleKey || !sharedWith) continue;

      const result = await this.sharedSvc.createOrUpdateShare(
        req.tenantConn,
        ownerMemberId,
        moduleKey,
        null,
        sharedWith,
        null,
      );
      results.push({ moduleKey, updated: true, count: sharedWith.length });
    }

    return { success: true, results };
  }
}
