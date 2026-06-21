import { Controller, Get, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { ToggleStaffDto } from './dto/toggle-staff.dto';
import { AdminGuard } from './guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('users')
  users() {
    return this.service.listUsers();
  }

  @Patch('users/:id/plan')
  changePlan(
    @CurrentUser() admin: { id: string },
    @Param('id') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.service.changePlan(admin.id, userId, dto.plan, dto.note);
  }

  @Patch('users/:id/staff')
  toggleStaff(
    @CurrentUser() admin: { id: string },
    @Param('id') userId: string,
    @Body() dto: ToggleStaffDto,
  ) {
    return this.service.toggleStaff(admin.id, userId, dto.isStaff);
  }

  @Get('users/:id/history')
  userHistory(@Param('id') userId: string) {
    return this.service.getUserHistory(userId);
  }

  @Get('history')
  globalHistory(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.getGlobalHistory(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      userId,
    );
  }
}
