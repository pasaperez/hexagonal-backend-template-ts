import { afterEach, describe, expect, it, vi } from 'vitest';
import { createConsoleDestination, formatLogRecord, formatTimestamp, shouldColorizeOutput } from '../../../../src/infrastructure/logging/consoleFormatter';

describe('consoleFormatter', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('formats a log line with the Spring-like console layout', () => {
        const line: string = formatLogRecord({
            app: 'hexagonal-backend-template-ts',
            component: 'http',
            level: 'INFO',
            msg: 'GET /health -> 200 (5 ms)',
            pid: 4321,
            req: { id: 'req-7' },
            time: '26/03/2026 - 20:15:30 (123)'
        }, { appName: 'hexagonal-backend-template-ts', colorize: false });

        expect(line).toContain('26/03/2026 - 20:15:30 (123)');
        expect(line).toContain(' INFO');
        expect(line).toContain('hexagonal-backend-template-ts [pid:4321] [req:req-7]');
        expect(line).toContain('http');
        expect(line).toContain('GET /health -> 200 (5 ms)');
    });

    it('includes metadata and stack traces without duplicating reserved fields', () => {
        const line: string = formatLogRecord({
            level: 50,
            message: 'boom',
            module: 'users',
            msg: 'Unexpected error',
            name: 'Error',
            stack: 'Error: boom\n    at line 1',
            time: '26/03/2026 - 20:15:30 (123)',
            useCase: 'CreateUserUseCase',
            userId: 'user-1'
        }, { appName: 'hexagonal-backend-template-ts', colorize: false });

        expect(line).toContain('ERROR');
        expect(line).toContain('users.CreateUserUseCase');
        expect(line).toContain('Unexpected error {"message":"boom","name":"Error","userId":"user-1"}');
        expect(line).toContain('\nError: boom');
    });

    it('formats timestamps from numbers and preserves custom timestamp strings', () => {
        const numericTimestamp: string = formatTimestamp(Date.UTC(2026, 2, 26, 12, 34, 56, 789));
        const customTimestamp: string = formatTimestamp('custom timestamp');
        const invalidTimestamp: string = formatTimestamp('2026-99-99');
        const defaultTimestamp: string = formatTimestamp();

        expect(numericTimestamp).toMatch(/^\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}:\d{2} \(\d{3}\)$/);
        expect(customTimestamp).toBe('custom timestamp');
        expect(invalidTimestamp).toBe('2026-99-99');
        expect(defaultTimestamp).toMatch(/^\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}:\d{2} \(\d{3}\)$/);
    });

    it('decides when console colors should be enabled', () => {
        expect(shouldColorizeOutput({ isTTY: true }, {})).toBe(true);
        expect(shouldColorizeOutput({ isTTY: false }, {})).toBe(false);
        expect(shouldColorizeOutput({ isTTY: true }, { NODE_ENV: 'test' })).toBe(false);
        expect(shouldColorizeOutput({ isTTY: true }, { NO_COLOR: '1' })).toBe(false);
    });

    it('covers additional level, request-id and context variants', () => {
        const warnLine: string = formatLogRecord({
            level: 'WARN',
            module: 'users',
            msg: 'warn message',
            reqId: 99,
            time: '26/03/2026 - 20:15:30 (123)'
        }, { appName: 'hexagonal-backend-template-ts', colorize: true });
        const debugLine: string = formatLogRecord({
            level: 'DEBUG',
            msg: 'debug message',
            req: { id: { nested: true } as unknown },
            time: '26/03/2026 - 20:15:30 (123)',
            useCase: 'HealthProbe'
        }, { appName: 'hexagonal-backend-template-ts', colorize: true });
        const traceLine: string = formatLogRecord({ level: 'TRACE', msg: 'trace message', time: '26/03/2026 - 20:15:30 (123)' }, {
            appName: 'hexagonal-backend-template-ts',
            colorize: true
        });
        const defaultLine: string = formatLogRecord({ time: '26/03/2026 - 20:15:30 (123)' }, {
            appName: 'hexagonal-backend-template-ts',
            colorize: false
        });

        expect(warnLine).toContain('\u001B[');
        expect(warnLine).toContain('[req:99]');
        expect(warnLine).toContain('users');
        expect(debugLine).toContain('HealthProbe');
        expect(debugLine).not.toContain('[req:');
        expect(traceLine).toContain('trace message');
        expect(defaultLine).toContain(' INFO');
        expect(defaultLine).toContain(' app ');
        expect(defaultLine).toContain(' : ');
    });

    it('writes info logs to stdout and error logs to stderr', () => {
        const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const stderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
        const destination = createConsoleDestination({ appName: 'hexagonal-backend-template-ts', colorize: false });

        destination.write(JSON.stringify({ level: 'INFO', msg: 'info message', time: '26/03/2026 - 20:15:30 (123)' }));
        destination.write(
            JSON.stringify({ err: { stack: 'Error: boom' }, level: 'ERROR', msg: 'error message', time: '26/03/2026 - 20:15:30 (123)' })
        );

        expect(stdoutWrite).toHaveBeenCalledWith(expect.stringContaining('info message'));
        expect(stderrWrite).toHaveBeenCalledWith(expect.stringContaining('error message'));
    });

    it('ignores empty lines and falls back to raw output for non-json messages', () => {
        const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
        const destination = createConsoleDestination({ appName: 'hexagonal-backend-template-ts', colorize: false });

        destination.write('\n');
        destination.write('plain log line');
        destination.write('plain log line with newline\n');

        expect(stdoutWrite).toHaveBeenCalledTimes(2);
        expect(stdoutWrite).toHaveBeenCalledWith('plain log line\n');
        expect(stdoutWrite).toHaveBeenCalledWith('plain log line with newline\n');
    });
});
