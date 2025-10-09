import { Point, Rect, ComponentStyle } from '../models/component.model';

export class GeometryUtil {
  static rotatePoint(center: Point, point: Point, angle: number): Point {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    return {
      x: (point.x - center.x) * cos - (point.y - center.y) * sin + center.x,
      y: (point.x - center.x) * sin + (point.y - center.y) * cos + center.y
    };
  }

  static calculateResizedPosition(
    point: string,
    style: ComponentStyle,
    curPosition: Point
  ): Partial<ComponentStyle> {
    const { top, left, width, height } = style;
    const newStyle: Partial<ComponentStyle> = {};
    const minSize = 10;

    switch (point) {
      case 'lt':
        newStyle.width = Math.max(minSize, width + (left - curPosition.x));
        newStyle.height = Math.max(minSize, height + (top - curPosition.y));
        newStyle.left = left + width - newStyle.width;
        newStyle.top = top + height - newStyle.height;
        break;

      case 't':
        newStyle.height = Math.max(minSize, height + (top - curPosition.y));
        newStyle.top = top + height - newStyle.height;
        break;

      case 'rt':
        newStyle.width = Math.max(minSize, curPosition.x - left);
        newStyle.height = Math.max(minSize, height + (top - curPosition.y));
        newStyle.top = top + height - newStyle.height;
        break;

      case 'r':
        newStyle.width = Math.max(minSize, curPosition.x - left);
        break;

      case 'rb':
        newStyle.width = Math.max(minSize, curPosition.x - left);
        newStyle.height = Math.max(minSize, curPosition.y - top);
        break;

      case 'b':
        newStyle.height = Math.max(minSize, curPosition.y - top);
        break;

      case 'lb':
        newStyle.width = Math.max(minSize, width + (left - curPosition.x));
        newStyle.height = Math.max(minSize, curPosition.y - top);
        newStyle.left = left + width - newStyle.width;
        break;

      case 'l':
        newStyle.width = Math.max(minSize, width + (left - curPosition.x));
        newStyle.left = left + width - newStyle.width;
        break;
    }

    return newStyle;
  }

  static isPointInRect(point: Point, rect: Rect): boolean {
    return (
      point.x >= rect.left &&
      point.x <= rect.left + rect.width &&
      point.y >= rect.top &&
      point.y <= rect.top + rect.height
    );
  }
}
