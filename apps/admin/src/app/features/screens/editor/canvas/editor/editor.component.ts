import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../services/canvas.service';
import { CanvasQuery } from '../services/canvas.query';
import { ShapeComponent } from './shape/shape.component';
import { MarkLineComponent } from './mark-line/mark-line.component';
import { AreaComponent } from './area/area.component';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ComponentItem, ComponentStyle, Rect } from '../../models/component.model';
import { GeometryUtil } from '../../utils/geometry.util';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, ShapeComponent, MarkLineComponent, AreaComponent, DragDropModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  @ViewChild(MarkLineComponent) markLine!: MarkLineComponent;

  componentData$ = this.query.componentData$;
  editMode$ = this.query.editMode$;
  selectedComponentIds$ = this.query.selectedComponentIds$;

  isSelecting = false;
  selectionArea?: Rect;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  onComponentDrop(event: CdkDragDrop<any>): void {
    const componentType = event.item.data;
    const dropPoint = event.dropPoint;
    const editorRect = (event.event.target as HTMLElement)
      .closest('.editor-container')
      ?.getBoundingClientRect();

    if (!editorRect) return;

    const scale = this.query.getValue().scale;
    const x = (dropPoint.x - editorRect.left) / scale;
    const y = (dropPoint.y - editorRect.top) / scale;

    const newComponent: ComponentItem = {
      id: this.generateId(),
      type: componentType,
      component: componentType,
      style: {
        top: y,
        left: x,
        width: 200,
        height: 150,
        rotate: 0,
        zIndex: 1
      },
      config: {}
    };

    this.canvasService.addComponent(newComponent);
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
}
