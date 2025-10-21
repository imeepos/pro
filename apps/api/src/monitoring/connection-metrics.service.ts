import { Injectable, Logger } from '@nestjs/common';
import { Counter, Gauge, Histogram, register } from 'prom-client';

type ConnectionNamespace = 'screens' | 'graphql';

interface MetricLabels {
  namespace: ConnectionNamespace;
  transport: string;
}

@Injectable()
export class ConnectionMetricsService {
  private readonly logger = new Logger(ConnectionMetricsService.name);
  private readonly activeConnections: Gauge<string>;
  private readonly connectionDuration: Histogram<string>;
  private readonly authFailures: Counter<string>;
  private readonly connectionRejections: Counter<string>;

  constructor() {
    this.activeConnections = this.assureGauge(
      'websocket_active_connections',
      'Number of active WebSocket connections grouped by namespace and transport',
      ['namespace', 'transport']
    );

    this.connectionDuration = this.assureHistogram(
      'websocket_connection_duration_seconds',
      'Observed connection lifetime in seconds',
      ['namespace', 'transport']
    );

    this.authFailures = this.assureCounter(
      'websocket_auth_failures_total',
      'Authentication failures during WebSocket handshakes',
      ['namespace', 'reason']
    );

    this.connectionRejections = this.assureCounter(
      'websocket_connection_rejections_total',
      'Rejected WebSocket connections',
      ['namespace', 'reason']
    );
  }

  recordConnectionOpened(namespace: ConnectionNamespace, transport: string) {
    this.activeConnections.inc({ namespace, transport } satisfies MetricLabels);
  }

  recordConnectionClosed(namespace: ConnectionNamespace, transport: string, durationMs: number) {
    this.activeConnections.dec({ namespace, transport } satisfies MetricLabels);
    this.connectionDuration.observe({ namespace, transport } satisfies MetricLabels, durationMs / 1000);
  }

  recordAuthFailure(namespace: ConnectionNamespace, reason: string) {
    this.authFailures.inc({ namespace, reason });
  }

  recordRejection(namespace: ConnectionNamespace, reason: string) {
    this.connectionRejections.inc({ namespace, reason });
  }

  private assureGauge(name: string, help: string, labelNames: string[]): Gauge<string> {
    const existing = register.getSingleMetric(name) as Gauge<string> | undefined;
    if (existing) {
      return existing;
    }

    this.logger.log(`Registering gauge ${name}`);
    return new Gauge({ name, help, labelNames });
  }

  private assureHistogram(name: string, help: string, labelNames: string[]): Histogram<string> {
    const existing = register.getSingleMetric(name) as Histogram<string> | undefined;
    if (existing) {
      return existing;
    }

    this.logger.log(`Registering histogram ${name}`);
    return new Histogram({
      name,
      help,
      labelNames,
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600],
    });
  }

  private assureCounter(name: string, help: string, labelNames: string[]): Counter<string> {
    const existing = register.getSingleMetric(name) as Counter<string> | undefined;
    if (existing) {
      return existing;
    }

    this.logger.log(`Registering counter ${name}`);
    return new Counter({ name, help, labelNames });
  }
}
