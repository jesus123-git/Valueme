import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseStatus } from '@prisma/client';

class UpdatePurchaseStatusDto {
  @ApiProperty({ enum: PurchaseStatus })
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;
}

@ApiTags('Purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear orden de compra' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.purchasesService.create(user.id, businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar órdenes de compra' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('status') status?: string,
  ) {
    return this.purchasesService.findAll(user.id, businessId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de orden de compra' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.findOne(user.id, businessId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado: DRAFT → RECEIVED → PAID' })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseStatusDto,
  ) {
    return this.purchasesService.updateStatus(user.id, businessId, id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar orden de compra (no aplica si está pagada)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.purchasesService.remove(user.id, businessId, id);
  }
}
