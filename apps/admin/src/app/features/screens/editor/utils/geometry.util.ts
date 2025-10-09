import { Point, Rect, ComponentStyle } from '../models/component.model';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

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

  static mod360(deg: number): number {
    return (deg + 360) % 360;
  }

  static getComponentCenter(style: ComponentStyle): Point {
    return {
      x: style.left + style.width / 2,
      y: style.top + style.height / 2
    };
  }

  static lineEquationY(k: number, p1: Point, x: number): number {
    return k * (x - p1.x) + p1.y;
  }

  static lineEquationX(k: number, p1: Point, y: number): number {
    return p1.x - (p1.y - y) / k;
  }

  private static calculateLeftTop(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, width, height } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left + width, y: top + height };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = newFreezePoint.y - realPoint.y;
    const realWidth = newFreezePoint.x - realPoint.x;

    return {
      top: realPoint.y,
      left: realPoint.x,
      width: realWidth,
      height: realHeight
    };
  }

  private static calculateLeft(style: ComponentStyle, toPoint: Point): Position {
    const { left, rotate, width, height, top } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left + width, y: top + height / 2 };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    if (rotate % 180 !== 90) {
      const k = (center.y - afterFreezePoint.y) / (center.x - afterFreezePoint.x);
      const y = this.lineEquationY(k, center, toPoint.x);
      toPoint.y = y;
    } else {
      toPoint.x = center.x;
    }

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realWidth = newFreezePoint.x - realPoint.x;

    return {
      top: newCenter.y - height / 2,
      left: realPoint.x,
      width: realWidth,
      height: height
    };
  }

  private static calculateLeftBottom(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, width } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left + width, y: top };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = realPoint.y - newFreezePoint.y;
    const realWidth = newFreezePoint.x - realPoint.x;

    return {
      top: realPoint.y - realHeight,
      left: realPoint.x,
      width: realWidth,
      height: realHeight
    };
  }

  private static calculateBottom(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, width } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left + width / 2, y: top };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    if (rotate % 180 !== 90) {
      const k = (center.y - afterFreezePoint.y) / (center.x - afterFreezePoint.x);
      const x = this.lineEquationX(k, center, toPoint.y);
      toPoint.x = x;
    } else {
      toPoint.y = center.y;
    }

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = realPoint.y - newFreezePoint.y;

    return {
      top: realPoint.y - realHeight,
      left: newCenter.x - width / 2,
      width,
      height: realHeight
    };
  }

  private static calculateTop(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, width, height } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left + width / 2, y: top + height };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    if (rotate % 180 !== 90) {
      const k = (center.y - afterFreezePoint.y) / (center.x - afterFreezePoint.x);
      const x = this.lineEquationX(k, center, toPoint.y);
      toPoint.x = x;
    } else {
      toPoint.y = center.y;
    }

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = newFreezePoint.y - realPoint.y;

    return {
      top: realPoint.y,
      left: newCenter.x - width / 2,
      width,
      height: realHeight
    };
  }

  private static calculateRightTop(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, height } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left, y: top + height };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = newFreezePoint.y - realPoint.y;
    const realWidth = realPoint.x - newFreezePoint.x;

    return {
      top: realPoint.y,
      left: newFreezePoint.x,
      width: realWidth,
      height: realHeight
    };
  }

  private static calculateRightBottom(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left, y: top };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realHeight = realPoint.y - newFreezePoint.y;
    const realWidth = realPoint.x - newFreezePoint.x;

    return {
      top: newFreezePoint.y,
      left: newFreezePoint.x,
      width: realWidth,
      height: realHeight
    };
  }

  private static calculateRight(style: ComponentStyle, toPoint: Point): Position {
    const { top, left, rotate, height } = style;
    const center = this.getComponentCenter(style);

    const freezePoint: Point = { x: left, y: top + height / 2 };
    const afterFreezePoint = this.rotatePoint(center, freezePoint, rotate);

    if (rotate % 180 !== 90) {
      const k = (center.y - afterFreezePoint.y) / (center.x - afterFreezePoint.x);
      const y = this.lineEquationY(k, center, toPoint.x);
      toPoint.y = y;
    } else {
      toPoint.x = center.x;
    }

    const newCenter: Point = {
      x: (afterFreezePoint.x + toPoint.x) / 2,
      y: (afterFreezePoint.y + toPoint.y) / 2
    };

    const realPoint = this.rotatePoint(newCenter, toPoint, -rotate);
    const newFreezePoint = this.rotatePoint(newCenter, afterFreezePoint, -rotate);
    const realWidth = realPoint.x - newFreezePoint.x;

    return {
      top: newFreezePoint.y - height / 2,
      left: newFreezePoint.x,
      width: realWidth,
      height
    };
  }

  private static resizeFunctions: Record<string, (style: ComponentStyle, toPoint: Point) => Position> = {
    lt: this.calculateLeftTop.bind(this),
    t: this.calculateTop.bind(this),
    rt: this.calculateRightTop.bind(this),
    r: this.calculateRight.bind(this),
    rb: this.calculateRightBottom.bind(this),
    b: this.calculateBottom.bind(this),
    lb: this.calculateLeftBottom.bind(this),
    l: this.calculateLeft.bind(this)
  };

  static calculateResizedPosition(
    point: string,
    style: ComponentStyle,
    curPosition: Point
  ): Partial<ComponentStyle> {
    const rotate = style.rotate || 0;

    if (rotate === 0) {
      return this.calculateSimpleResize(point, style, curPosition);
    }

    const resizeFunc = this.resizeFunctions[point];
    if (!resizeFunc) {
      return {};
    }

    const toPoint = { ...curPosition };
    const position = resizeFunc(style, toPoint);

    return {
      top: Math.round(position.top),
      left: Math.round(position.left),
      width: Math.round(Math.max(10, position.width)),
      height: Math.round(Math.max(10, position.height))
    };
  }

  private static calculateSimpleResize(
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

  static isRectIntersect(rect1: Rect, rect2: Rect): boolean {
    return !(
      rect1.left + rect1.width < rect2.left ||
      rect2.left + rect2.width < rect1.left ||
      rect1.top + rect1.height < rect2.top ||
      rect2.top + rect2.height < rect1.top
    );
  }

  static getRectCenter(rect: Rect): Point {
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
}
