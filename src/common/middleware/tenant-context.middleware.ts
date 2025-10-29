import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantConnectionManager } from '../tenant-connection.manager';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tenantConnMgr: TenantConnectionManager,
    private readonly configService: ConfigService, // ✅ Inject ConfigService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Exclude SuperAdmin routes
    if (req.originalUrl.startsWith('/superadmin')) {
      // skip tenant middleware
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];
    try {
      const jwtSecret =
        this.configService.get<string>('JWT_SECRET');

      const decoded = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      // Set user info from token
      (req as any).user = decoded;

      // Get or create tenant connection
      const conn = await this.tenantConnMgr.getOrCreateConnection(decoded.tenantId);
      (req as any).tenantConn = conn;

      next();
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
