import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentItem, ComponentStyle } from '../../../models/component.model';

interface AlignmentCondition {
  line: string;
  dragValue: number;
  targetValue: number;
  snapValue: number;
  prop: 'top' | 'left';
  distance?: number;
  strength?: number;
}

interface LinePosition {
  top?: number;
  left?: number;
  distance?: number;
}

@Component({
  selector: 'app-mark-line',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mark-line.component.html',
  styleUrls: ['./mark-line.component.scss']
})
export class MarkLineComponent {
  lineStatus: Record<string, boolean> = {
    xt: false,
    xc: false,
    xb: false,
    yl: false,
    yc: false,
    yr: false
  };

  linePositions: Record<string, LinePosition> = {
    xt: {},
    xc: {},
    xb: {},
    yl: {},
    yc: {},
    yr: {}
  };

  private readonly threshold = 5;

  showLine(dragComponent: ComponentItem, allComponents: ComponentItem[]): Partial<ComponentStyle> | null {
    this.hideAllLines();

    let snapStyle: Partial<ComponentStyle> | null = null;

    allComponents.forEach(comp => {
      if (comp.id === dragComponent.id) return;

      const conditions = this.calculateAlignmentConditions(dragComponent, comp);

      conditions.forEach(condition => {
        const distance = Math.abs(condition.dragValue - condition.targetValue);

        if (this.isNearly(condition.dragValue, condition.targetValue)) {
          if (!snapStyle) {
            snapStyle = {};
          }
          snapStyle[condition.prop] = condition.snapValue;

          condition.distance = Math.round(distance);

          this.lineStatus[condition.line] = true;
          this.linePositions[condition.line] = this.calculateLinePosition(condition);
        }
      });
    });

    return snapStyle;
  }

  hideAllLines(): void {
    Object.keys(this.lineStatus).forEach(key => {
      this.lineStatus[key] = false;
    });
  }

  private isNearly(value1: number, value2: number): boolean {
    return Math.abs(value1 - value2) <= this.threshold;
  }

  private calculateAlignmentConditions(
    dragComp: ComponentItem,
    targetComp: ComponentItem
  ): AlignmentCondition[] {
    const conditions: AlignmentCondition[] = [];
    const dragStyle = dragComp.style;
    const targetStyle = targetComp.style;

    const dragTop = dragStyle.top;
    const dragBottom = dragStyle.top + dragStyle.height;
    const dragCenterY = dragStyle.top + dragStyle.height / 2;

    const dragLeft = dragStyle.left;
    const dragRight = dragStyle.left + dragStyle.width;
    const dragCenterX = dragStyle.left + dragStyle.width / 2;

    const targetTop = targetStyle.top;
    const targetBottom = targetStyle.top + targetStyle.height;
    const targetCenterY = targetStyle.top + targetStyle.height / 2;

    const targetLeft = targetStyle.left;
    const targetRight = targetStyle.left + targetStyle.width;
    const targetCenterX = targetStyle.left + targetStyle.width / 2;

    conditions.push(
      { line: 'xt', dragValue: dragTop, targetValue: targetTop, snapValue: targetTop, prop: 'top' },
      { line: 'xt', dragValue: dragTop, targetValue: targetCenterY, snapValue: targetCenterY, prop: 'top' },
      { line: 'xt', dragValue: dragTop, targetValue: targetBottom, snapValue: targetBottom, prop: 'top' },

      { line: 'xc', dragValue: dragCenterY, targetValue: targetTop, snapValue: targetTop - dragStyle.height / 2, prop: 'top' },
      { line: 'xc', dragValue: dragCenterY, targetValue: targetCenterY, snapValue: targetCenterY - dragStyle.height / 2, prop: 'top' },
      { line: 'xc', dragValue: dragCenterY, targetValue: targetBottom, snapValue: targetBottom - dragStyle.height / 2, prop: 'top' },

      { line: 'xb', dragValue: dragBottom, targetValue: targetTop, snapValue: targetTop - dragStyle.height, prop: 'top' },
      { line: 'xb', dragValue: dragBottom, targetValue: targetCenterY, snapValue: targetCenterY - dragStyle.height, prop: 'top' },
      { line: 'xb', dragValue: dragBottom, targetValue: targetBottom, snapValue: targetBottom - dragStyle.height, prop: 'top' },

      { line: 'yl', dragValue: dragLeft, targetValue: targetLeft, snapValue: targetLeft, prop: 'left' },
      { line: 'yl', dragValue: dragLeft, targetValue: targetCenterX, snapValue: targetCenterX, prop: 'left' },
      { line: 'yl', dragValue: dragLeft, targetValue: targetRight, snapValue: targetRight, prop: 'left' },

      { line: 'yc', dragValue: dragCenterX, targetValue: targetLeft, snapValue: targetLeft - dragStyle.width / 2, prop: 'left' },
      { line: 'yc', dragValue: dragCenterX, targetValue: targetCenterX, snapValue: targetCenterX - dragStyle.width / 2, prop: 'left' },
      { line: 'yc', dragValue: dragCenterX, targetValue: targetRight, snapValue: targetRight - dragStyle.width / 2, prop: 'left' },

      { line: 'yr', dragValue: dragRight, targetValue: targetLeft, snapValue: targetLeft - dragStyle.width, prop: 'left' },
      { line: 'yr', dragValue: dragRight, targetValue: targetCenterX, snapValue: targetCenterX - dragStyle.width, prop: 'left' },
      { line: 'yr', dragValue: dragRight, targetValue: targetRight, snapValue: targetRight - dragStyle.width, prop: 'left' }
    );

    return conditions;
  }

  private calculateLinePosition(condition: AlignmentCondition): LinePosition {
    if (condition.prop === 'top') {
      return {
        top: condition.targetValue,
        distance: condition.distance
      };
    } else {
      return {
        left: condition.targetValue,
        distance: condition.distance
      };
    }
  }

  getLineClass(line: string): string {
    return line.startsWith('x') ? 'line-horizontal' : 'line-vertical';
  }

  isLineVisible(line: string): boolean {
    return this.lineStatus[line];
  }

  getLineStyle(line: string): Record<string, string> {
    const position = this.linePositions[line];
    const style: Record<string, string> = {};

    if (position.top !== undefined) {
      style['top'] = `${position.top}px`;
    }
    if (position.left !== undefined) {
      style['left'] = `${position.left}px`;
    }

    return style;
  }

  getDistance(line: string): number | undefined {
    return this.linePositions[line]?.distance;
  }

  shouldShowDistance(line: string): boolean {
    const distance = this.getDistance(line);
    return this.isLineVisible(line) && distance !== undefined && distance > 0;
  }
}
