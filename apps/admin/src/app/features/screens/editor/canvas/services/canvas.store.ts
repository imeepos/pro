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
  snapToGrid: boolean;
  gridSize: number;
  darkTheme: boolean;
  showMarkLine: boolean;
  isDirty: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error' | 'retrying';
  lastSaveError: SaveError | null;
  retryCount: number;
  isOnline: boolean;
  networkStatus: 'online' | 'offline' | 'checking';
}

export interface SaveError {
  type: 'network' | 'server' | 'permission' | 'timeout' | 'unknown';
  message: string;
  timestamp: number;
  retryable: boolean;
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
    snapToGrid: false,
    gridSize: 10,
    darkTheme: false,
    showMarkLine: true,
    isDirty: false,
    saveStatus: 'saved',
    lastSaveError: null,
    retryCount: 0,
    isOnline: navigator.onLine,
    networkStatus: 'online'
  };
}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'canvas' })
export class CanvasStore extends Store<CanvasState> {
  constructor() {
    super(createInitialState());
  }
}
