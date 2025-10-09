import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CanvasService } from '../services/canvas.service';
import { CanvasQuery } from '../services/canvas.query';
import { ComponentItem } from '../../models/component.model';

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  hasError?: boolean;
  errorMessage?: string;
}

@Component({
  selector: 'app-layer-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  templateUrl: './layer-panel.component.html',
  styleUrls: ['./layer-panel.component.scss']
})
export class LayerPanelComponent {
  private canvasService = inject(CanvasService);
  private canvasQuery = inject(CanvasQuery);

  componentData$ = this.canvasQuery.componentData$;
  activeComponentId$ = this.canvasQuery.activeComponentId$;

  contextMenu = signal<{ x: number; y: number; layerId: string } | null>(null);
  renamingLayerId = signal<string | null>(null);
  newLayerName = signal('');

  layers = computed(() => {
    const components = this.canvasQuery.getValue().componentData;
    return this.mapToLayers(components).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  });

  activeLayerId = computed(() => {
    return this.canvasQuery.getValue().activeComponentId;
  });

  private mapToLayers(components: ComponentItem[]): LayerItem[] {
    return components.map(comp => ({
      id: comp.id,
      name: comp.component || comp.type || '未命名组件',
      type: comp.type,
      visible: comp.display !== false,
      locked: comp.locked || false,
      zIndex: comp.style.zIndex || 0,
      hasError: comp.hasError,
      errorMessage: comp.errorInfo?.message
    }));
  }

  onDrop(event: CdkDragDrop<LayerItem[]>): void {
    const layers = [...this.layers()];
    moveItemInArray(layers, event.previousIndex, event.currentIndex);

    layers.forEach((layer, index) => {
      const newZIndex = layers.length - index;
      this.canvasService.updateComponentZIndex(layer.id, newZIndex);
    });
  }

  selectLayer(layerId: string): void {
    this.canvasService.activateComponent(layerId);
  }

  toggleVisibility(event: Event, layerId: string): void {
    event.stopPropagation();
    this.canvasService.toggleComponentVisibility(layerId);
  }

  toggleLock(event: Event, layerId: string): void {
    event.stopPropagation();
    this.canvasService.toggleComponentLock(layerId);
  }

  onContextMenu(event: MouseEvent, layerId: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenu.set({ x: event.clientX, y: event.clientY, layerId });
  }

  closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  startRename(layerId: string): void {
    const layer = this.layers().find(l => l.id === layerId);
    if (layer) {
      this.newLayerName.set(layer.name);
      this.renamingLayerId.set(layerId);
      this.closeContextMenu();
    }
  }

  confirmRename(): void {
    const layerId = this.renamingLayerId();
    const newName = this.newLayerName().trim();

    if (layerId && newName) {
      this.canvasService.updateComponent(layerId, { component: newName });
    }

    this.renamingLayerId.set(null);
    this.newLayerName.set('');
  }

  cancelRename(): void {
    this.renamingLayerId.set(null);
    this.newLayerName.set('');
  }

  deleteLayer(layerId: string): void {
    this.canvasService.removeComponent(layerId);
    this.closeContextMenu();
  }

  duplicateLayer(layerId: string): void {
    this.canvasService.duplicateComponent(layerId);
    this.closeContextMenu();
  }

  getLayerIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'text': '📝',
      'image': '🖼️',
      'button': '🔘',
      'container': '📦',
      'chart': '📊',
      'table': '📋',
      'video': '🎥',
      'audio': '🔊'
    };
    return iconMap[type] || '🧩';
  }
}
