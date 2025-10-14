import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';

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

    return super.transform(value, format, timezone, locale);
  }
}