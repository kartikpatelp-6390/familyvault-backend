import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperadminModule } from './superadmin/superadmin.module';
import { AuthModule } from './auth/auth.module';
import { TenantConnectionManager } from './common/tenant-connection.manager';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './common/strategies/jwt.strategy';
import { ExampleController } from './example/example.controller';
import { FamilyMemberModule } from './family-member/family-member.module';
import { DocumentModule } from './document/document.module';
import { RolesModule } from './roles/roles.module';
import { ConfModule } from './conf/conf.module';
import { BankAccountModule } from './bank-account/bank-account.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Connect to central DB (dbName specified)
    MongooseModule.forRootAsync({
      imports: [ConfigModule, ConfModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
        dbName: configService.get<string>('CENTRAL_DB'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    SuperadminModule,
    RolesModule,
    AuthModule,
    FamilyMemberModule,
    DocumentModule,
    BankAccountModule,
  ],
  controllers: [ExampleController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    TenantConnectionManager, JwtStrategy
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      // Apply middleware to all routes EXCEPT these
      .exclude(
        { path: 'auth/login', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
