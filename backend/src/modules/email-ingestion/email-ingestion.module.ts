import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EncryptionModule } from '../../common/encryption/encryption.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { EmailIngestionService } from './email-ingestion.service';

@Module({
  imports: [
    ScheduleModule,
    EncryptionModule,
    WebhooksModule,
    TransactionsModule,
  ],
  providers: [EmailIngestionService],
})
export class EmailIngestionModule {}
