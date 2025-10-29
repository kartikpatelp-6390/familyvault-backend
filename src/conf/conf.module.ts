import { Module } from '@nestjs/common';
import { ConfController } from './conf.controller';

@Module({
  controllers: [ConfController],
})
export class ConfModule {}
