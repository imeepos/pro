import { Injectable } from '@angular/core';
import { Point } from '../../models/component.model';

@Injectable({ providedIn: 'root' })
export class TransformService {
  screenToCanvas(point: Point, scale: number, offset: Point = { x: 0, y: 0 }): Point {
    return {
      x: (point.x - offset.x) / scale,
      y: (point.y - offset.y) / scale
    };
  }

  canvasToScreen(point: Point, scale: number, offset: Point = { x: 0, y: 0 }): Point {
    return {
      x: point.x * scale + offset.x,
      y: point.y * scale + offset.y
    };
  }
}
