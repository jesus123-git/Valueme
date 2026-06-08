import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses/:businessId/products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // POST /api/v1/businesses/:businessId/products
  @Post()
  @ApiOperation({ summary: 'Crear producto o servicio' })
  create(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(user.id, businessId, dto);
  }

  // GET /api/v1/businesses/:businessId/products
  @Get()
  @ApiOperation({ summary: 'Listar productos/servicios (filtro: type=PRODUCT|SERVICE)' })
  findAll(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Query('type') type?: string,
  ) {
    return this.productsService.findAll(user.id, businessId, type);
  }

  // GET /api/v1/businesses/:businessId/products/:id
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un producto' })
  findOne(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.findOne(user.id, businessId, id);
  }

  // PATCH /api/v1/businesses/:businessId/products/:id
  @Patch(':id')
  @ApiOperation({ summary: 'Editar producto o servicio' })
  update(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.id, businessId, id, dto);
  }

  // DELETE /api/v1/businesses/:businessId/products/:id
  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar producto (soft delete)' })
  remove(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(user.id, businessId, id);
  }
}
