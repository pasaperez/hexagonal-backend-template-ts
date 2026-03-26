import { InvalidArgumentError } from '../shared/InvalidArgumentError';

export interface HealthStatusPrimitives {
    name: string;
    version: string;
    environment: string;
    status: 'ok';
    timestamp: string;
    uptimeSeconds: number;
}

interface HealthStatusProps {
    name: string;
    version: string;
    environment: string;
    timestamp: Date;
    uptimeSeconds: number;
}

export class HealthStatus {
    constructor(private readonly props: HealthStatusProps) {
        if (props.name.trim().length === 0) {
            throw new InvalidArgumentError('Health service name cannot be empty');
        }

        if (props.version.trim().length === 0) {
            throw new InvalidArgumentError('Health version cannot be empty');
        }

        if (!Number.isFinite(props.uptimeSeconds) || props.uptimeSeconds < 0) {
            throw new InvalidArgumentError('Health uptime must be a positive finite number');
        }
    }

    public toPrimitives(): HealthStatusPrimitives {
        return {
            name: this.props.name,
            version: this.props.version,
            environment: this.props.environment,
            status: 'ok',
            timestamp: this.props.timestamp.toISOString(),
            uptimeSeconds: Number(this.props.uptimeSeconds.toFixed(2))
        };
    }
}
