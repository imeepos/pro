import { Injectable, ViewContainerRef, ComponentRef } from '@angular/core';
import { MarkLineComponent } from '../editor/mark-line/mark-line.component';
import { ComponentItem, ComponentStyle } from '../../models/component.model';

@Injectable({
  providedIn: 'root'
})
export class MarkLineService {
  private markLineRef: MarkLineComponent | null = null;

  registerMarkLine(markLine: MarkLineComponent): void {
    this.markLineRef = markLine;
  }

  unregisterMarkLine(): void {
    this.markLineRef = null;
  }

  showMarkLine(dragComponent: ComponentItem, allComponents: ComponentItem[]): Partial<ComponentStyle> | null {
    if (!this.markLineRef) return null;
    return this.markLineRef.showLine(dragComponent, allComponents);
  }

  hideMarkLine(): void {
    if (this.markLineRef) {
      this.markLineRef.hideAllLines();
    }
  }
}