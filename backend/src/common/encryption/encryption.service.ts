import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM  = 'aes-256-gcm';
const IV_BYTES   = 12;

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const raw = config.get<string>('ENCRYPTION_KEY') ?? 'fallback-insecure-key';
    this.key = crypto.createHash('sha256').update(raw).digest();
  }

  encrypt(plaintext: string): string {
    const iv      = crypto.randomBytes(IV_BYTES);
    const cipher  = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const enc     = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag     = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, dataHex] = ciphertext.split(':');
    const iv      = Buffer.from(ivHex, 'hex');
    const tag     = Buffer.from(tagHex, 'hex');
    const data    = Buffer.from(dataHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(data).toString('utf8') + decipher.final('utf8');
  }
}
