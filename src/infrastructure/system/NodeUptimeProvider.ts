import type { UptimeProvider } from '../../application/shared/ports/UptimeProvider';

export class NodeUptimeProvider implements UptimeProvider {
    public getUptimeSeconds(): number {
        return process.uptime();
    }
}
