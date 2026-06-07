import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  // POST /api/v1/businesses/:businessId/transactions
  @Post()
  @ApiOperation({ summary: 'Registrar ingreso o gasto empresarial' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, businessId, dto);
  }

  // GET /api/v1/businesses/:businessId/transactions
  @Get()
  @ApiOperation({ summary: 'Listar transacciones con filtros y resumen' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query() filters: FilterTransactionDto,
  ) {
    return this.transactionsService.findAll(user.id, businessId, filters);
  }

  // GET /api/v1/businesses/:businessId/transactions/summary
  @Get('summary')
  @ApiOperation({ summary: 'Resumen mensual de ingresos y gastos por categoría' })
  @ApiQuery({ name: 'year', example: 2026 })
  @ApiQuery({ name: 'month', example: 6 })
  getMonthlySummary(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.transactionsService.getMonthlySummary(
      user.id,
      businessId,
      parseInt(year),
      parseInt(month),
    );
  }

  // GET /api/v1/businesses/:businessId/transactions/:id
  @Get(':id')
  @ApiOperation({ summary: 'Obtener una transacción por ID' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.findOne(user.id, businessId, id);
  }

  // PATCH /api/v1/businesses/:businessId/transactions/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Editar una transacción' })
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, businessId, id, dto);
  }

  // DELETE /api/v1/businesses/:businessId/transactions/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una transacción' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.transactionsService.remove(user.id, businessId, id);
  }
}
