import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../services/canvas.service';
import { CanvasQuery } from '../services/canvas.query';
import { RulerGridService } from '../services/ruler-grid.service';
import { ShapeComponent } from './shape/shape.component';
import { MarkLineComponent } from './mark-line/mark-line.component';
import { AreaComponent } from './area/area.component';
import { ComponentItem, ComponentStyle, Rect } from '../../models/component.model';
import { GeometryUtil } from '../../utils/geometry.util';
import { ContextMenuComponent, MenuItem } from './context-menu/context-menu.component';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, ShapeComponent, MarkLineComponent, AreaComponent, ContextMenuComponent],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  @ViewChild(MarkLineComponent, { static: false }) markLine!: MarkLineComponent;

  componentData$ = this.query.componentData$;
  editMode$ = this.query.editMode$;
  selectedComponentIds$ = this.query.selectedComponentIds$;

  isSelecting = false;
  selectionArea?: Rect;

  showContextMenu = false;
  contextMenuX = 0;
  contextMenuY = 0;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private rulerGridService: RulerGridService,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  onComponentDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;

    const componentType = event.dataTransfer.getData('componentType');
    if (!componentType) return;

    // 获取画布容器的位置
    const editorRect = this.elementRef.nativeElement.getBoundingClientRect();
    const scale = this.query.getValue().scale;

    // 计算组件在画布中的位置（考虑缩放）
    const x = (event.clientX - editorRect.left) / scale;
    const y = (event.clientY - editorRect.top) / scale;

    const newComponent: ComponentItem = {
      id: this.generateId(),
      type: componentType,
      component: componentType,
      style: {
        top: Math.max(0, Math.round(y)),
        left: Math.max(0, Math.round(x)),
        width: 200,
        height: 150,
        rotate: 0,
        zIndex: this.getNextZIndex()
      },
      config: {}
    };

    this.canvasService.addComponent(newComponent);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  private getNextZIndex(): number {
    const components = this.query.getValue().componentData;
    if (components.length === 0) return 1;
    return Math.max(...components.map(c => c.style.zIndex || 1)) + 1;
  }

  @HostListener('click', ['$event'])
  onEditorClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('editor-container')) {
      this.canvasService.deactivateComponent();
      if (!event.shiftKey) {
        this.canvasService.clearSelection();
      }
    }
  }

  @HostListener('contextmenu', ['$event'])
  onEditorContextMenu(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('editor-container')) return;

    const selectedIds = this.query.getValue().selectedComponentIds;
    if (selectedIds.length > 1) {
      event.preventDefault();
      event.stopPropagation();
      this.contextMenuX = event.clientX;
      this.contextMenuY = event.clientY;
      this.showContextMenu = true;
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('editor-container')) return;

    this.isSelecting = true;
    const editorRect = this.elementRef.nativeElement.getBoundingClientRect();
    const scale = this.query.getValue().scale;

    const startX = (event.clientX - editorRect.left) / scale;
    const startY = (event.clientY - editorRect.top) / scale;

    const move = (e: MouseEvent) => {
      if (!this.isSelecting) return;

      const currentX = (e.clientX - editorRect.left) / scale;
      const currentY = (e.clientY - editorRect.top) / scale;

      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      this.selectionArea = { left, top, width, height };
    };

    const up = () => {
      if (this.selectionArea) {
        this.selectComponentsInArea(this.selectionArea, event.shiftKey);
      }
      this.isSelecting = false;
      this.selectionArea = undefined;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  private selectComponentsInArea(area: Rect, addToSelection: boolean): void {
    const components = this.query.getValue().componentData;
    const selectedIds: string[] = [];

    components.forEach(comp => {
      const compRect: Rect = {
        left: comp.style.left,
        top: comp.style.top,
        width: comp.style.width,
        height: comp.style.height
      };

      if (this.isRectIntersect(area, compRect)) {
        selectedIds.push(comp.id);
      }
    });

    if (addToSelection) {
      const currentIds = this.query.getValue().selectedComponentIds;
      const mergedIds = [...new Set([...currentIds, ...selectedIds])];
      this.canvasService.selectMultipleComponents(mergedIds);
    } else {
      this.canvasService.selectMultipleComponents(selectedIds);
    }
  }

  private isRectIntersect(rect1: Rect, rect2: Rect): boolean {
    return !(
      rect1.left + rect1.width < rect2.left ||
      rect2.left + rect2.width < rect1.left ||
      rect1.top + rect1.height < rect2.top ||
      rect2.top + rect2.height < rect1.top
    );
  }

  get selectedCount(): number {
    return this.query.getValue().selectedComponentIds.length;
  }

  trackByComponent(index: number, component: ComponentItem): string {
    return component.id;
  }

  private generateId(): string {
    return `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  showMarkLine(dragComponent: ComponentItem): Partial<ComponentStyle> | null {
    if (!this.markLine) return null;
    const allComponents = this.query.getValue().componentData;
    return this.markLine.showLine(dragComponent, allComponents);
  }

  hideMarkLine(): void {
    if (this.markLine) {
      this.markLine.hideAllLines();
    }
  }

  get multiSelectContextMenuItems(): MenuItem[] {
    const selectedIds = this.query.getValue().selectedComponentIds;

    return [
      {
        label: `组合 (${selectedIds.length}个组件)`,
        icon: '📦',
        handler: () => this.composeComponents(),
        disabled: selectedIds.length < 2
      },
      { divider: true, label: '', handler: () => {} },
      {
        label: '左对齐',
        icon: '⬅️',
        handler: () => this.alignComponents('left')
      },
      {
        label: '右对齐',
        icon: '➡️',
        handler: () => this.alignComponents('right')
      },
      {
        label: '顶部对齐',
        icon: '⬆️',
        handler: () => this.alignComponents('top')
      },
      {
        label: '底部对齐',
        icon: '⬇️',
        handler: () => this.alignComponents('bottom')
      },
      {
        label: '水平居中',
        icon: '↔️',
        handler: () => this.alignComponents('centerH')
      },
      {
        label: '垂直居中',
        icon: '↕️',
        handler: () => this.alignComponents('centerV')
      },
      { divider: true, label: '', handler: () => {} },
      {
        label: '水平分布',
        icon: '⬌',
        handler: () => this.distributeHorizontally(),
        disabled: selectedIds.length < 3
      },
      {
        label: '垂直分布',
        icon: '⬍',
        handler: () => this.distributeVertically(),
        disabled: selectedIds.length < 3
      },
      { divider: true, label: '', handler: () => {} },
      {
        label: '批量删除',
        icon: '🗑️',
        handler: () => this.batchDelete()
      }
    ];
  }

  closeContextMenu(): void {
    this.showContextMenu = false;
  }

  private composeComponents(): void {
    const selectedIds = this.query.getValue().selectedComponentIds;
    if (selectedIds.length >= 2) {
      this.canvasService.composeComponents(selectedIds);
    }
  }

  private alignComponents(type: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV'): void {
    const selectedIds = this.query.getValue().selectedComponentIds;
    this.canvasService.batchAlign(selectedIds, type);
    this.canvasService.recordSnapshot();
  }

  private distributeHorizontally(): void {
    const selectedIds = this.query.getValue().selectedComponentIds;
    this.canvasService.distributeHorizontally(selectedIds);
    this.canvasService.recordSnapshot();
  }

  private distributeVertically(): void {
    const selectedIds = this.query.getValue().selectedComponentIds;
    this.canvasService.distributeVertically(selectedIds);
    this.canvasService.recordSnapshot();
  }

  private batchDelete(): void {
    const selectedIds = this.query.getValue().selectedComponentIds;
    this.canvasService.batchDelete(selectedIds);
    this.canvasService.recordSnapshot();
  }
}
