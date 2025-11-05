import { IsString, IsOptional } from 'class-validator';

export class RevokeShareDto {
  @IsString()
  ownerMemberId: string;

  @IsString()
  moduleKey: string;

  @IsString()
  targetMemberId: string;

  @IsOptional()
  @IsString()
  resourceId?: string | null;
}
