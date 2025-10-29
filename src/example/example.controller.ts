import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('example')
export class ExampleController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyInfo(@CurrentUser() user: any, @Req() req: any) {
    return {
      message: 'Authenticated request successful',
      user,
      tenantDb: req.tenantConn?.name || 'unknown',
    };
  }
}
