import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasService } from './services/canvas.service';
import { CanvasQuery } from './services/canvas.query';
import { RulerGridService } from './services/ruler-grid.service';
import { EditorComponent } from './editor/editor.component';
import { RulerWrapperComponent } from './editor/ruler';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule, EditorComponent, RulerWrapperComponent],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent {
  scale$ = this.query.scale$;
  canvasStyle$ = this.query.canvasStyle$;

  constructor(
    private canvasService: CanvasService,
    private query: CanvasQuery,
    private rulerGridService: RulerGridService
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
    const isInputFocused = this.isInputElement(event.target as HTMLElement);

    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !isInputFocused) {
      event.preventDefault();
      this.canvasService.copyComponents();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !isInputFocused) {
      event.preventDefault();
      this.canvasService.pasteComponents();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'x' && !isInputFocused) {
      event.preventDefault();
      this.canvasService.cutComponents();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'd' && !isInputFocused) {
      event.preventDefault();
      const activeId = this.query.getValue().activeComponentId;
      if (activeId) {
        this.canvasService.duplicateComponent(activeId);
      }
    }

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
      if (selectedIds.length > 0 && !isInputFocused) {
        event.preventDefault();
        this.canvasService.batchDelete(selectedIds);
      }
    }
  }

  private isInputElement(element: HTMLElement): boolean {
    const tagName = element?.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || element?.isContentEditable;
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

  onRulerSettingsToggle(): void {
    // 这里可以实现标尺设置面板的显示/隐藏
    console.log('标尺设置面板切换');
    // TODO: 实现设置面板
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // 标尺网格快捷键
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      this.rulerGridService.toggleRuler();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
      event.preventDefault();
      this.rulerGridService.toggleGrid();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key === ';') {
      event.preventDefault();
      this.rulerGridService.clearReferenceLines();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'G') {
      event.preventDefault();
      this.rulerGridService.toggleSnapToGrid();
      return;
    }
  }
}
