import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { TransactionsModule } from '../transactions/transactions.module';

// PrismaModule es @Global() → no hace falta importarlo.
// TransactionsModule se importa para usar TransactionsService.createForWebhook.
@Module({
  imports: [TransactionsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
