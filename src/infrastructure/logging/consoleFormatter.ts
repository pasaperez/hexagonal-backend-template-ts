import type { DestinationStream } from 'pino';

export interface ConsoleFormatterOptions {
    appName: string;
    colorize?: boolean;
}

export interface LogRecord extends Record<string, unknown> {
    app?: string;
    component?: string;
    err?: Record<string, unknown>;
    level?: number | string;
    module?: string;
    msg?: string;
    pid?: number;
    req?: Record<string, unknown>;
    reqId?: number | string;
    stack?: string;
    time?: number | string;
    useCase?: string;
}

type ColorName = 'blue' | 'brightCyan' | 'cyan' | 'faint' | 'green' | 'magenta' | 'red' | 'yellow';

const COLOR_CODES: Record<ColorName, string> = {
    blue: '\u001B[34m',
    brightCyan: '\u001B[96m',
    cyan: '\u001B[36m',
    faint: '\u001B[2m',
    green: '\u001B[32m',
    magenta: '\u001B[35m',
    red: '\u001B[31m',
    yellow: '\u001B[33m'
};
const RESET_COLOR: string = '\u001B[0m';
const LEVEL_LABELS: Record<number, string> = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };
const RESERVED_KEYS: ReadonlySet<string> = new Set([
    'app',
    'component',
    'err',
    'hostname',
    'level',
    'module',
    'msg',
    'pid',
    'req',
    'reqId',
    'res',
    'responseTime',
    'stack',
    'time',
    'useCase'
]);
const PRETTY_DATE_PATTERN: RegExp = /^\d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}:\d{2} \(\d{3}\)$/;

class PrettyConsoleDestination implements DestinationStream {
    constructor(private readonly options: ConsoleFormatterOptions) {}

    public write(message: string): void {
        const normalizedMessage: string = message.trimEnd();

        if (normalizedMessage.length === 0) {
            return;
        }

        try {
            const record: LogRecord = JSON.parse(normalizedMessage) as LogRecord;
            const output: string = `${formatLogRecord(record, this.options)}\n`;

            if (isErrorLevel(record.level)) {
                process.stderr.write(output);
                return;
            }

            process.stdout.write(output);
        } catch {
            process.stdout.write(message.endsWith('\n') ? message : `${message}\n`);
        }
    }
}

export function createConsoleDestination(options: ConsoleFormatterOptions): DestinationStream {
    return new PrettyConsoleDestination(options);
}

export function shouldColorizeOutput(
    stream: Pick<NodeJS.WriteStream, 'isTTY'> = process.stdout,
    env: NodeJS.ProcessEnv = process.env
): boolean {
    return Boolean(stream.isTTY) && env.NO_COLOR === undefined && env.NODE_ENV !== 'test';
}

export function formatLogRecord(record: LogRecord, options: ConsoleFormatterOptions): string {
    const level: string = padLevel(resolveLevelLabel(record.level));
    const requestId: string | undefined = resolveRequestId(record);
    const meta: string = formatMeta(record);
    const stack: string | undefined = resolveStack(record);
    const segments: string[] = [
        colorizeText(formatTimestamp(record.time), 'magenta', options.colorize),
        colorizeText(level, colorForLevel(level.trim()), options.colorize),
        colorizeText('-', 'faint', options.colorize),
        colorizeText(String(record.app ?? options.appName), 'brightCyan', options.colorize),
        colorizeText(`[pid:${String(record.pid ?? process.pid)}]`, 'blue', options.colorize)
    ];

    if (requestId) {
        segments.push(colorizeText(`[req:${requestId}]`, 'faint', options.colorize));
    }

    segments.push(
        colorizeText(padContext(resolveContext(record)), 'cyan', options.colorize),
        colorizeText(':', 'faint', options.colorize),
        String(record.msg ?? '')
    );

    if (meta) {
        segments.push(meta);
    }

    const formattedLine: string = segments.join(' ');

    return stack ? `${formattedLine}\n${stack}` : formattedLine;
}

export function formatTimestamp(value?: number | string): string {
    if (typeof value === 'string' && PRETTY_DATE_PATTERN.test(value)) {
        return value;
    }

    if (typeof value === 'string' && Number.isNaN(new Date(value).getTime())) {
        return value;
    }

    const date: Date = new Date(value ?? Date.now());

    return `${pad(date.getDate(), 2)}/${pad(date.getMonth() + 1, 2)}/${date.getFullYear()} - ${pad(date.getHours(), 2)}:${
        pad(date.getMinutes(), 2)
    }:${pad(date.getSeconds(), 2)} (${pad(date.getMilliseconds(), 3)})`;
}

function resolveLevelLabel(level?: number | string): string {
    if (typeof level === 'string' && level.length > 0) {
        return level.toUpperCase();
    }

    if (typeof level === 'number' && LEVEL_LABELS[level]) {
        return LEVEL_LABELS[level];
    }

    return 'INFO';
}

function resolveContext(record: LogRecord): string {
    if (typeof record.component === 'string' && record.component.length > 0) {
        return record.component;
    }
    if (typeof record.module === 'string' && record.module.length > 0 && typeof record.useCase === 'string' && record.useCase.length > 0) {
        return `${record.module}.${record.useCase}`;
    }
    if (typeof record.module === 'string' && record.module.length > 0) {
        return record.module;
    }
    if (typeof record.useCase === 'string' && record.useCase.length > 0) {
        return record.useCase;
    }
    return 'app';
}

function resolveRequestId(record: LogRecord): string | undefined {
    if (record.reqId !== undefined && record.reqId !== null && record.reqId !== '') {
        return String(record.reqId);
    }

    if (record.req && typeof record.req === 'object' && 'id' in record.req && isStringifiable(record.req.id)) {
        return String(record.req.id);
    }

    return undefined;
}

function resolveStack(record: LogRecord): string | undefined {
    if (record.err && typeof record.err === 'object' && typeof record.err.stack === 'string') {
        return record.err.stack;
    }

    if (typeof record.stack === 'string' && record.stack.length > 0) {
        return record.stack;
    }

    return undefined;
}

function formatMeta(record: LogRecord): string {
    const metadata: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
        if (value === undefined || RESERVED_KEYS.has(key)) {
            continue;
        }

        metadata[key] = value;
    }

    return Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '';
}

function colorizeText(text: string, color: ColorName, enabled: boolean | undefined): string {
    if (!enabled) {
        return text;
    }

    return `${COLOR_CODES[color]}${text}${RESET_COLOR}`;
}

function colorForLevel(level: string): ColorName {
    switch (level) {
        case 'ERROR':
        case 'FATAL':
            return 'red';
        case 'WARN':
            return 'yellow';
        case 'DEBUG':
            return 'cyan';
        case 'TRACE':
            return 'magenta';
        default:
            return 'green';
    }
}

function isErrorLevel(level?: number | string): boolean {
    const resolvedLevel: string = resolveLevelLabel(level);

    return resolvedLevel === 'ERROR' || resolvedLevel === 'FATAL';
}

function isStringifiable(value: unknown): value is boolean | number | string {
    return typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string';
}

function pad(value: number, size: number): string {
    return String(value).padStart(size, '0');
}

function padContext(context: string): string {
    return context.padEnd(36, ' ').slice(0, 36);
}

function padLevel(level: string): string {
    return level.padStart(5, ' ');
}
