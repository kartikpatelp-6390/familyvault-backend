import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ unique: true, required: true })
  tenantId: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ type: [String], default: [] })
  modules: string[];

  @Prop({ default: true })
  enabled: boolean;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
