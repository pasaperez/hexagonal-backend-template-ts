import pino, { type LevelWithSilent, type Logger as PinoInstance } from 'pino';
import type { Logger } from '../../application/shared/ports/Logger';
import { createConsoleDestination, shouldColorizeOutput } from './consoleFormatter';

export class PinoLogger implements Logger {
    public static create(level: LevelWithSilent, appName: string): PinoLogger {
        return new PinoLogger(
            pino({
                base: { app: appName, pid: process.pid },
                formatters: { level: (label: string): Record<string, string> => ({ level: label.toUpperCase() }) },
                level
            }, createConsoleDestination({ appName, colorize: shouldColorizeOutput() }))
        );
    }

    constructor(private readonly logger: PinoInstance) {}

    public toPino(): PinoInstance {
        return this.logger;
    }

    public child(bindings: Record<string, unknown>): PinoLogger {
        return new PinoLogger(this.logger.child(bindings));
    }

    public debug(message: string, meta?: Record<string, unknown>): void {
        this.logger.debug(meta ?? {}, message);
    }

    public info(message: string, meta?: Record<string, unknown>): void {
        this.logger.info(meta ?? {}, message);
    }

    public warn(message: string, meta?: Record<string, unknown>): void {
        this.logger.warn(meta ?? {}, message);
    }

    public error(message: string, meta?: Record<string, unknown>): void {
        this.logger.error(meta ?? {}, message);
    }
}
