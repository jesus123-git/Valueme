import { IsBoolean } from 'class-validator';

export class ToggleStaffDto {
  @IsBoolean()
  isStaff: boolean;
}
