import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
export interface JwtPayload {
    sub: string;
    email: string;
}
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly prisma;
    constructor(prisma: PrismaService, configService: ConfigService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        name: string | null;
    }>;
}
export {};
