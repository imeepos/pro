import { Injectable } from '@angular/core';
import { Query } from '@datorama/akita';
import { CanvasStore, CanvasState } from './canvas.store';
import { Observable } from 'rxjs';
import { ComponentItem } from '../../models/component.model';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CanvasQuery extends Query<CanvasState> {
  componentData$ = this.select('componentData');
  activeComponentId$ = this.select('activeComponentId');
  selectedComponentIds$ = this.select('selectedComponentIds');
  scale$ = this.select('scale');
  canvasStyle$ = this.select('canvasStyle');
  editMode$ = this.select('editMode');
  showGrid$ = this.select('showGrid');

  activeComponent$ = this.select(
    state => state.componentData.find(comp => comp.id === state.activeComponentId)
  );

  selectedComponents$ = this.select(
    state => state.componentData.filter(comp => state.selectedComponentIds.includes(comp.id))
  );

  constructor(protected override store: CanvasStore) {
    super(store);
  }

  getComponentById(id: string): ComponentItem | undefined {
    return this.getValue().componentData.find((comp) => comp.id === id);
  }

  getActiveComponent(): ComponentItem | undefined {
    const activeId = this.getValue().activeComponentId;
    return activeId ? this.getComponentById(activeId) : undefined;
  }

  getSelectedComponents(): ComponentItem[] {
    const ids = this.getValue().selectedComponentIds;
    return this.getValue().componentData.filter(c => ids.includes(c.id));
  }
}
