import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SuperadminModule } from '../superadmin/superadmin.module';

@Module({
  imports: [
    SuperadminModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'familyVaultJWTSecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
