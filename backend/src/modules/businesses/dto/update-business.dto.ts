import { PartialType } from '@nestjs/swagger';
import { CreateBusinessDto } from './create-business.dto';

// PartialType hace todos los campos opcionales automáticamente
export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {}
