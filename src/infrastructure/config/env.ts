import { z } from 'zod';

export interface Environment {
    NODE_ENV: 'development' | 'test' | 'production';
    HOST: string;
    PORT: number;
    LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
    APP_NAME: string;
    APP_VERSION: string;
}

const environmentSchema: z.ZodType<Environment> = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('0.0.0.0'),
    PORT: z.coerce.number().int().positive().default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
    APP_NAME: z.string().min(1).default('hexagonal-backend-template-ts'),
    APP_VERSION: z.string().min(1).default('1.0.0')
});

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
    return environmentSchema.parse(source);
}
