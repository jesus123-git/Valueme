import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '@prisma/client';

class UpdateStatusDto {
  @ApiProperty({ enum: QuoteStatus })
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
}

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/quotes')
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cotización' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.quotesService.create(user.id, businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones (filtro: status)' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('status') status?: string,
  ) {
    return this.quotesService.findAll(user.id, businessId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cotización' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.quotesService.findOne(user.id, businessId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado: DRAFT → SENT → ACCEPTED | REJECTED' })
  updateStatus(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.quotesService.updateStatus(user.id, businessId, id, dto.status);
  }

  @Post(':id/convert')
  @ApiOperation({ summary: 'Convertir cotización aceptada en factura' })
  convertToInvoice(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.quotesService.convertToInvoice(user.id, businessId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cotización (no aplica si ya fue facturada)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.quotesService.remove(user.id, businessId, id);
  }
}
