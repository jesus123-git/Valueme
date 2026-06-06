import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { NequiWebhookPayloadDto } from './dto/nequi-webhook-payload.dto';
import { NequiAuthGuard } from './guards/nequi-auth.guard';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  /**
   * Endpoint público para el webhook de Nequi.
   * NO requiere JWT de sesión — simula una llamada entrante de Nequi.
   * Se protege con el header X-Nequi-Auth (API Key compartido).
   */
  @Post('nequi')
  @HttpCode(HttpStatus.OK)
  @UseGuards(NequiAuthGuard)
  @ApiOperation({
    summary: 'Webhook Nequi',
    description:
      'Registra automáticamente una transacción en la cuenta Nequi ' +
      'identificada por el número de teléfono. ' +
      'Requiere el header X-Nequi-Auth con la API Key secreta.',
  })
  @ApiHeader({
    name: 'X-Nequi-Auth',
    description: 'API Key secreta (NEQUI_WEBHOOK_SECRET en el .env)',
    required: true,
  })
  @ApiOkResponse({ description: 'Transacción registrada y balance actualizado' })
  @ApiUnauthorizedResponse({ description: 'X-Nequi-Auth inválido o ausente' })
  handleNequi(@Body() payload: NequiWebhookPayloadDto) {
    return this.webhooks.handleNequi(payload);
  }
}
