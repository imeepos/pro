import { Injectable, Logger, TooManyRequestsException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ConnectionNamespace = 'screens' | 'graphql';

interface GatekeeperConfig {
  handshakeWindowMs: number;
  maxHandshakesPerIp: number;
  handshakeCooldownMs: number;
  failureWindowMs: number;
  maxFailuresPerIp: number;
  failureCooldownMs: number;
  maxConnectionsPerUser: number;
  maxConnectionsPerIp: number;
}

interface HandshakeRecord {
  attempts: number[];
  failures: number[];
  blockedUntil?: number;
}

interface ConnectionRecord {
  clientId: string;
  ip: string;
  userId?: string;
  namespace: ConnectionNamespace;
  connectedAt: number;
  lastSeenAt: number;
}

const DEFAULT_CONFIG: GatekeeperConfig = {
  handshakeWindowMs: 10_000,
  maxHandshakesPerIp: 20,
  handshakeCooldownMs: 15_000,
  failureWindowMs: 60_000,
  maxFailuresPerIp: 5,
  failureCooldownMs: 120_000,
  maxConnectionsPerUser: 8,
  maxConnectionsPerIp: 12,
};

@Injectable()
export class ConnectionGatekeeper {
  private readonly logger = new Logger(ConnectionGatekeeper.name);
  private readonly handshakeLedger = new Map<string, HandshakeRecord>();
  private readonly activeConnections = new Map<string, ConnectionRecord>();
  private readonly ipConnectionIndex = new Map<string, Set<string>>();
  private readonly userConnectionIndex = new Map<string, Set<string>>();
  private readonly config: GatekeeperConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.resolveConfig();
  }

  assertHandshakeAllowed(ip: string | undefined, namespace: ConnectionNamespace): void {
    const key = ip ?? 'unknown';
    const record = this.getHandshakeRecord(key);
    const now = Date.now();

    if (record.blockedUntil && now < record.blockedUntil) {
      this.logger.warn(
        `Handshake rejected: ip=${key}, namespace=${namespace}, blockedUntil=${new Date(record.blockedUntil).toISOString()}`,
      );
      throw new TooManyRequestsException('Handshake rate limit reached');
    }

    record.attempts = record.attempts.filter((timestamp) => now - timestamp < this.config.handshakeWindowMs);

    if (record.attempts.length >= this.config.maxHandshakesPerIp) {
      record.blockedUntil = now + this.config.handshakeCooldownMs;
      this.logger.warn(
        `Handshake throttled: ip=${key}, namespace=${namespace}, window=${this.config.handshakeWindowMs}ms`,
      );
      throw new TooManyRequestsException('Too many handshake attempts');
    }

    record.attempts.push(now);
  }

  recordHandshakeFailure(ip: string | undefined, namespace: ConnectionNamespace): void {
    const key = ip ?? 'unknown';
    const record = this.getHandshakeRecord(key);
    const now = Date.now();

    record.failures = record.failures.filter((timestamp) => now - timestamp < this.config.failureWindowMs);
    record.failures.push(now);

    if (record.failures.length >= this.config.maxFailuresPerIp) {
      record.blockedUntil = now + this.config.failureCooldownMs;
      this.logger.warn(
        `Handshake temporarily banned: ip=${key}, namespace=${namespace}, failures=${record.failures.length}`,
      );
    }
  }

  openLease(clientId: string, options: { ip: string | undefined; userId?: string; namespace: ConnectionNamespace }): () => void {
    const ipKey = options.ip ?? 'unknown';
    const now = Date.now();

    this.ensureIpCapacity(ipKey, options.namespace);
    if (options.userId) {
      this.ensureUserCapacity(options.userId, options.namespace);
    }

    this.trackConnection(clientId, {
      clientId,
      ip: ipKey,
      userId: options.userId,
      namespace: options.namespace,
      connectedAt: now,
      lastSeenAt: now,
    });

    return () => this.release(clientId);
  }

  markHeartbeat(clientId: string): void {
    const connection = this.activeConnections.get(clientId);
    if (!connection) {
      return;
    }

    connection.lastSeenAt = Date.now();
  }

  release(clientId: string): void {
    const connection = this.activeConnections.get(clientId);
    if (!connection) {
      return;
    }

    this.activeConnections.delete(clientId);

    const ipPool = this.ipConnectionIndex.get(connection.ip);
    if (ipPool) {
      ipPool.delete(clientId);
      if (ipPool.size === 0) {
        this.ipConnectionIndex.delete(connection.ip);
      }
    }

    if (connection.userId) {
      const userPool = this.userConnectionIndex.get(connection.userId);
      if (userPool) {
        userPool.delete(clientId);
        if (userPool.size === 0) {
          this.userConnectionIndex.delete(connection.userId);
        }
      }
    }
  }

  listConnections(): ConnectionRecord[] {
    return Array.from(this.activeConnections.values());
  }

  private ensureIpCapacity(ip: string, namespace: ConnectionNamespace): void {
    const pool = this.ipConnectionIndex.get(ip);
    if (pool && pool.size >= this.config.maxConnectionsPerIp) {
      this.logger.warn(`Connection denied: ip=${ip}, namespace=${namespace}, active=${pool.size}`);
      throw new TooManyRequestsException('Connection limit per IP reached');
    }
  }

  private ensureUserCapacity(userId: string, namespace: ConnectionNamespace): void {
    const pool = this.userConnectionIndex.get(userId);
    if (pool && pool.size >= this.config.maxConnectionsPerUser) {
      this.logger.warn(`Connection denied: userId=${userId}, namespace=${namespace}, active=${pool.size}`);
      throw new TooManyRequestsException('Connection limit per user reached');
    }
  }

  private trackConnection(clientId: string, record: ConnectionRecord): void {
    this.activeConnections.set(clientId, record);

    if (!this.ipConnectionIndex.has(record.ip)) {
      this.ipConnectionIndex.set(record.ip, new Set());
    }
    this.ipConnectionIndex.get(record.ip)!.add(clientId);

    if (record.userId) {
      if (!this.userConnectionIndex.has(record.userId)) {
        this.userConnectionIndex.set(record.userId, new Set());
      }
      this.userConnectionIndex.get(record.userId)!.add(clientId);
    }
  }

  private getHandshakeRecord(ip: string): HandshakeRecord {
    const record = this.handshakeLedger.get(ip);
    if (record) {
      return record;
    }

    const freshRecord: HandshakeRecord = { attempts: [], failures: [] };
    this.handshakeLedger.set(ip, freshRecord);
    return freshRecord;
  }

  private resolveConfig(): GatekeeperConfig {
    const read = (key: string, fallback: number) => this.configService.get<number>(key, fallback);

    return {
      handshakeWindowMs: read('WS_HANDSHAKE_WINDOW_MS', DEFAULT_CONFIG.handshakeWindowMs),
      maxHandshakesPerIp: read('WS_MAX_HANDSHAKES_PER_IP', DEFAULT_CONFIG.maxHandshakesPerIp),
      handshakeCooldownMs: read('WS_HANDSHAKE_COOLDOWN_MS', DEFAULT_CONFIG.handshakeCooldownMs),
      failureWindowMs: read('WS_FAILURE_WINDOW_MS', DEFAULT_CONFIG.failureWindowMs),
      maxFailuresPerIp: read('WS_MAX_FAILURES_PER_IP', DEFAULT_CONFIG.maxFailuresPerIp),
      failureCooldownMs: read('WS_FAILURE_COOLDOWN_MS', DEFAULT_CONFIG.failureCooldownMs),
      maxConnectionsPerUser: read('WS_MAX_CONNECTIONS_PER_USER', DEFAULT_CONFIG.maxConnectionsPerUser),
      maxConnectionsPerIp: read('WS_MAX_CONNECTIONS_PER_IP', DEFAULT_CONFIG.maxConnectionsPerIp),
    };
  }
}
