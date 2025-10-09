import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DataSlot, DataResponse } from '../models/data-source.model';
import { DataSlotterState, DataSlotterStore } from './data-slotter.store';

@Injectable({ providedIn: 'root' })
export class DataSlotterQuery extends QueryEntity<DataSlotterState> {
  constructor(protected override store: DataSlotterStore) {
    super(store);
  }

  selectGlobalData(): Observable<Record<string, any>> {
    return this.select(state => state.globalData);
  }

  getGlobalData(key: string): any {
    return this.getValue().globalData[key];
  }

  selectGlobalDataByKey(key: string): Observable<any> {
    return this.select(state => state.globalData[key]);
  }

  selectSlotsByComponentId(componentId: string): Observable<DataSlot[]> {
    return this.selectAll({
      filterBy: slot => slot.componentId === componentId
    });
  }

  selectSlotData(slotId: string): Observable<DataResponse | undefined> {
    return this.selectEntity(slotId).pipe(
      map(slot => slot ? { status: slot.status, data: undefined, timestamp: slot.lastUpdate } : undefined)
    );
  }

  getSlotByComponentId(componentId: string): DataSlot | undefined {
    return this.getAll().find(slot => slot.componentId === componentId);
  }
}
