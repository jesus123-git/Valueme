import { IsEmail, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SaveEmailConfigDto {
  @IsEmail()
  emailUser: string;

  @IsString()
  emailPassword: string;

  @IsOptional()
  @IsString()
  emailHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  emailPort?: number;

  @IsOptional()
  @IsString()
  emailMailbox?: string;
}
