import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('pnl')
  @ApiOperation({ summary: 'P&L: ingresos vs gastos por mes' })
  getProfitAndLoss(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('months') months?: string,
  ) {
    return this.reportsService.getProfitAndLoss(user.id, businessId, months ? Number(months) : 12);
  }

  @Get('receivables')
  @ApiOperation({ summary: 'Cartera: facturas pendientes por cliente' })
  getReceivables(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.reportsService.getReceivables(user.id, businessId);
  }

  @Get('payables')
  @ApiOperation({ summary: 'Cuentas por pagar: órdenes pendientes' })
  getPayables(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.reportsService.getPayables(user.id, businessId);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Top productos por ingresos' })
  getTopProducts(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopProducts(user.id, businessId, limit ? Number(limit) : 10);
  }
}
