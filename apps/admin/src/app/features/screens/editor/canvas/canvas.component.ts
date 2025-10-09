import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from './services/canvas.service';
import { CanvasQuery } from './services/canvas.query';
import { EditorComponent } from './editor/editor.component';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, EditorComponent],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent {
  scale$ = this.query.scale$;
  canvasStyle$ = this.query.canvasStyle$;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery
  ) {}

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.canvasService.zoomIn();
    } else {
      this.canvasService.zoomOut();
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
      event.preventDefault();
      this.redo();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
      event.preventDefault();
      this.redo();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = this.query.getValue().selectedComponentIds;
      if (selectedIds.length > 0) {
        event.preventDefault();
        this.canvasService.batchDelete(selectedIds);
      }
    }
  }

  undo(): void {
    this.canvasService.undo();
  }

  redo(): void {
    this.canvasService.redo();
  }

  canUndo(): boolean {
    return this.canvasService.canUndo();
  }

  canRedo(): boolean {
    return this.canvasService.canRedo();
  }
}
