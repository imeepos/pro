import { Injectable } from '@angular/core';
import { Store, StoreConfig } from '@datorama/akita';
import { ComponentItem } from '../../models/component.model';
import { CanvasStyle, EditMode } from '../../models/canvas.model';

export interface CanvasState {
  name: string;
  thumbnail: string;
  editMode: EditMode;
  canvasStyle: CanvasStyle;
  componentData: ComponentItem[];
  activeComponentId: string | null;
  selectedComponentIds: string[];
  scale: number;
  showGrid: boolean;
  darkTheme: boolean;
}

function createInitialState(): CanvasState {
  return {
    name: '',
    thumbnail: '',
    editMode: 'edit',
    canvasStyle: {
      width: 1200,
      height: 800,
      background: '#ffffff'
    },
    componentData: [],
    activeComponentId: null,
    selectedComponentIds: [],
    scale: 1,
    showGrid: true,
    darkTheme: false
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'canvas' })
export class CanvasStore extends Store<CanvasState> {
  constructor() {
    super(createInitialState());
  }
}
