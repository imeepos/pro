import { Component, Input, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from '../../services/canvas.service';
import { CanvasQuery } from '../../services/canvas.query';
import { ComponentItem, ComponentStyle, Point } from '../../../models/component.model';
import { throttleFrame } from '../../../utils/throttle.util';
import { GeometryUtil } from '../../../utils/geometry.util';

@Component({
  selector: 'app-shape',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shape.component.html',
  styleUrls: ['./shape.component.scss']
})
export class ShapeComponent implements OnInit {
  @Input() component!: ComponentItem;
  @Input() editor?: any;

  isActive = false;
  private isDragging = false;
  private isResizing = false;
  private isRotating = false;

  resizePoints = ['lt', 't', 'rt', 'r', 'rb', 'b', 'lb', 'l'];

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private elementRef: ElementRef
  ) {}

  isSelected = false;

  ngOnInit(): void {
    this.query.activeComponentId$.subscribe((activeId) => {
      this.isActive = activeId === this.component.id;
    });

    this.query.selectedComponentIds$.subscribe((selectedIds) => {
      this.isSelected = selectedIds.includes(this.component.id);
    });
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    event.stopPropagation();

    if ((event.target as HTMLElement).classList.contains('shape-wrapper')) {
      this.canvasService.activateComponent(this.component.id);
      this.startDrag(event);
    }
  }

  private startDrag(event: MouseEvent): void {
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = this.component.style.left;
    const startTop = this.component.style.top;
    const scale = this.query.getValue().scale;

    this.isDragging = true;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isDragging) return;

      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;

      let newStyle: Partial<ComponentStyle> = {
        left: startLeft + deltaX,
        top: startTop + deltaY
      };

      this.canvasService.updateComponentStyle(this.component.id, newStyle);

      if (this.editor) {
        const snapStyle = this.editor.showMarkLine(this.component);
        if (snapStyle) {
          this.canvasService.updateComponentStyle(this.component.id, snapStyle);
        }
      }
    });

    const up = () => {
      this.isDragging = false;
      if (this.editor) {
        this.editor.hideMarkLine();
      }
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  @HostListener('dblclick', ['$event'])
  onDoubleClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onDelete(): void {
    this.canvasService.removeComponent(this.component.id);
  }

  getTransform(): string {
    return `rotate(${this.component.style.rotate}deg)`;
  }

  onResizeStart(point: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.isResizing = true;
    const scale = this.query.getValue().scale;
    const editorRect = this.elementRef.nativeElement.closest('.editor-container')?.getBoundingClientRect();

    if (!editorRect) return;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isResizing) return;

      const curPosition: Point = {
        x: (e.clientX - editorRect.left) / scale,
        y: (e.clientY - editorRect.top) / scale
      };

      const newStyle = GeometryUtil.calculateResizedPosition(
        point,
        this.component.style,
        curPosition
      );

      this.canvasService.updateComponentStyle(this.component.id, newStyle);
    });

    const up = () => {
      this.isResizing = false;
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  onRotateStart(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();

    this.isRotating = true;
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startAngle = Math.atan2(
      event.clientY - centerY,
      event.clientX - centerX
    ) * (180 / Math.PI);

    const initialRotate = this.component.style.rotate;

    const move = throttleFrame((e: MouseEvent) => {
      if (!this.isRotating) return;

      const currentAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      ) * (180 / Math.PI);

      const rotate = initialRotate + (currentAngle - startAngle);

      this.canvasService.updateComponentStyle(this.component.id, { rotate });
    });

    const up = () => {
      this.isRotating = false;
      this.canvasService.recordSnapshot();
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  getResizePointCursor(point: string): string {
    const cursors: Record<string, string> = {
      lt: 'nwse-resize',
      t: 'ns-resize',
      rt: 'nesw-resize',
      r: 'ew-resize',
      rb: 'nwse-resize',
      b: 'ns-resize',
      lb: 'nesw-resize',
      l: 'ew-resize'
    };
    return cursors[point] || 'default';
  }
}
