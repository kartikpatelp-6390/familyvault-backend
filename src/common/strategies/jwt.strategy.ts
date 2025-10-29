import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'jwt-secret-key',
    });
  }

  async validate(payload: any) {
    // This will be attached to request.user
    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      username: payload.username,
      name: payload.name,
      role: payload.role,
      relation: payload.relation,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
    };
  }
}
