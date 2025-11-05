import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsObject,
  IsISO8601,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Individual recipient structure
 */
class RecipientDto {
  @IsString()
  memberId: string;

  @IsOptional()
  @IsObject()
  permissions?: {
    read?: boolean;
    update?: boolean;
    delete?: boolean;
  };

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * Payload for creating or updating a share
 */
export class CreateShareDto {
  @IsString()
  moduleKey: string;

  /**
   * If null or omitted => applies to entire module.
   * If provided => applies to a specific resource.
   */
  @IsOptional()
  @IsString()
  resourceId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  sharedWith: RecipientDto[];

  @IsOptional()
  @IsString()
  note?: string;
}
