import { Module }                from '@nestjs/common';
import { EncryptionModule }      from '../../common/encryption/encryption.module';
import { EmailConfigController } from './email-config.controller';
import { EmailConfigService }    from './email-config.service';

@Module({
  imports:     [EncryptionModule],
  controllers: [EmailConfigController],
  providers:   [EmailConfigService],
  exports:     [EmailConfigService],
})
export class EmailConfigModule {}
