import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { DataSlot } from '../models/data-source.model';

export interface DataSlotterState extends EntityState<DataSlot, string> {
  globalData: Record<string, any>;
}

function createInitialState(): DataSlotterState {
  return {
    globalData: {}
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'data-slotter' })
export class DataSlotterStore extends EntityStore<DataSlotterState> {
  constructor() {
    super(createInitialState());
  }

  updateGlobalData(key: string, data: any): void {
    this.update(state => ({
      globalData: {
        ...state.globalData,
        [key]: data
      }
    }));
  }

  removeGlobalData(key: string): void {
    this.update(state => {
      const { [key]: _, ...rest } = state.globalData;
      return { globalData: rest };
    });
  }
}
