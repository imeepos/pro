import { Injectable } from '@nestjs/common';
import type { WeiboAccount } from './account.service';

export type AccountSelectionAlgorithm =
  | 'health_based'
  | 'weighted_random'
  | 'load_balanced'
  | 'round_robin';

@Injectable()
export class WeiboAccountSelector {
  private roundRobinIndex = 0;

  select(
    accounts: WeiboAccount[],
    algorithm: AccountSelectionAlgorithm,
  ): WeiboAccount | null {
    if (accounts.length === 0) {
      return null;
    }

    switch (algorithm) {
      case 'health_based':
        return this.selectByHealth(accounts);
      case 'weighted_random':
        return this.selectByWeightedRandom(accounts);
      case 'load_balanced':
        return this.selectByLoadBalancing(accounts);
      case 'round_robin':
      default:
        return this.selectByRoundRobin(accounts);
    }
  }

  private selectByHealth(accounts: WeiboAccount[]): WeiboAccount {
    return [...accounts].sort((a, b) => {
      if (b.healthScore !== a.healthScore) {
        return b.healthScore - a.healthScore;
      }
      return a.priority - b.priority;
    })[0];
  }

  private selectByWeightedRandom(accounts: WeiboAccount[]): WeiboAccount {
    const weights = accounts.map((account) => {
      const usagePenalty = Math.min(account.usageCount * 2, 50);
      const normalizedWeight = Math.max(account.healthScore + Math.max(0, 50 - usagePenalty), 1);
      return normalizedWeight;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let index = 0; index < accounts.length; index += 1) {
      random -= weights[index];
      if (random <= 0) {
        return accounts[index];
      }
    }

    return accounts[accounts.length - 1];
  }

  private selectByLoadBalancing(accounts: WeiboAccount[]): WeiboAccount {
    return [...accounts].sort((a, b) => {
      if (a.usageCount !== b.usageCount) {
        return a.usageCount - b.usageCount;
      }

      if (a.healthScore !== b.healthScore) {
        return b.healthScore - a.healthScore;
      }

      return a.priority - b.priority;
    })[0];
  }

  private selectByRoundRobin(accounts: WeiboAccount[]): WeiboAccount {
    const index = this.roundRobinIndex % accounts.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % accounts.length;
    return accounts[index];
  }
}
