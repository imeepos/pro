import { Pipe, PipeTransform, Injectable } from '@angular/core';
import { DatePipe } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
@Pipe({
  name: 'date',
  pure: true
})
export class SafeDatePipe extends DatePipe implements PipeTransform {
  override transform(value: any, format?: string, timezone?: string, locale?: string): string | null;
  override transform(value: null | undefined, format?: string, timezone?: string, locale?: string): null;
  override transform(value: any, format?: string, timezone?: string, locale?: string): string | null {
    // Convert any YYYY patterns to y patterns to avoid NG02300 error
    if (format && typeof format === 'string') {
      format = format.replace(/YYYY/g, 'y').replace(/DD/g, 'dd');
    }

    try {
      return super.transform(value, format, timezone, locale);
    } catch (error: any) {
      // 如果仍然出错，尝试使用默认格式
      console.warn('Date format error, falling back to default format:', error.message);
      return super.transform(value, 'y-MM-dd HH:mm:ss', timezone, locale);
    }
  }
}