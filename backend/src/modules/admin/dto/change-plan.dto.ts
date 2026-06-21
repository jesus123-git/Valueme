import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlanType } from '@prisma/client';

export class ChangePlanDto {
  @IsEnum(PlanType)
  plan: PlanType;

  @IsOptional()
  @IsString()
  note?: string;
}
