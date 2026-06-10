import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { EmailIngestionService } from './email-ingestion.service';

@Module({
  imports: [
    ScheduleModule,
    WebhooksModule,   // exporta WebhooksService (motor parseText + parseAmount)
  ],
  providers: [EmailIngestionService],
})
export class EmailIngestionModule {}
