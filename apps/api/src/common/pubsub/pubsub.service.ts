import { Injectable } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

@Injectable()
export class PubSubService {
  private readonly pubSub: PubSub;

  constructor() {
    this.pubSub = new PubSub();
  }

  publish<T>(triggerName: string, payload: T): Promise<void> {
    return this.pubSub.publish(triggerName, payload);
  }

  subscribe(triggerName: string, onMessage: (...args: unknown[]) => void): Promise<number> {
    return this.pubSub.subscribe(triggerName, onMessage);
  }

  unsubscribe(subId: number): void {
    this.pubSub.unsubscribe(subId);
  }

  asyncIterator<T>(triggers: string | string[]): AsyncIterableIterator<T> {
    return this.pubSub.asyncIterableIterator<T>(triggers);
  }
}
