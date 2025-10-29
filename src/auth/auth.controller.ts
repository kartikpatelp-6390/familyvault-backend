import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Post('login')
  async login(@Body() body: { tenantId: string; usernameOrEmail: string; password: string }) {
    return this.svc.login(body);
  }
}
