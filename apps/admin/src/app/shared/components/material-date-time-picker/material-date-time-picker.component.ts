import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'pro-material-date-time-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MaterialDateTimePickerComponent),
      multi: true
    }
  ],
  templateUrl: './material-date-time-picker.component.html',
  styleUrls: ['./material-date-time-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialDateTimePickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 基础配置
  @Input() placeholder = '请选择日期时间';
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;

  // 日期限制
  @Input() minDate?: Date;
  @Input() maxDate?: Date;

  // 功能开关
  @Input() allowClear = true;
  @Input() showTime = true;

  // 格式化
  @Input() dateFormat = 'yyyy-MM-dd';
  @Input() timeFormat = 'HH:mm:ss';

  // 事件输出
  @Output() dateChange = new EventEmitter<Date | null>();
  @Output() dateSelect = new EventEmitter<Date | null>();
  @Output() timeChange = new EventEmitter<{ hours: number; minutes: number; seconds: number }>();

  // 内部状态
  selectedDate: Date | null = null;
  inputText = '';

  // 时间相关状态
  hours: number = 0;
  minutes: number = 0;
  seconds: number = 0;

  // ControlValueAccessor 回调
  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== ControlValueAccessor 接口实现 ==========

  writeValue(value: Date | null): void {
    if (value) {
      this.selectedDate = new Date(value);
      this.hours = value.getHours();
      this.minutes = value.getMinutes();
      this.seconds = value.getSeconds();
      this.updateInputText();
    } else {
      this.clearSelection();
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  // ========== 公共方法 ==========

  onDateChange(date: Date | null): void {
    if (!date) {
      this.clearSelection();
      return;
    }

    this.selectedDate = new Date(date);
    this.applyTimeToDate();
    this.updateInputText();
    this.onChange(this.selectedDate);
    this.dateChange.emit(this.selectedDate);
    this.dateSelect.emit(this.selectedDate);
    this.onTouched();
  }

  clearSelection(): void {
    this.selectedDate = null;
    this.inputText = '';
    this.initializeTime();
    this.onChange(null);
    this.dateChange.emit(null);
    this.cdr.markForCheck();
  }

  onTimeChange(): void {
    if (this.selectedDate) {
      this.applyTimeToDate();
      this.updateInputText();
      this.onChange(this.selectedDate);
      this.dateChange.emit(this.selectedDate);
    }

    this.timeChange.emit({
      hours: this.hours,
      minutes: this.minutes,
      seconds: this.seconds
    });

    this.cdr.markForCheck();
  }

  onHoursChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.hours = Math.max(0, Math.min(23, value));
    this.onTimeChange();
  }

  onMinutesChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.minutes = Math.max(0, Math.min(59, value));
    this.onTimeChange();
  }

  onSecondsChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value) || 0;
    this.seconds = Math.max(0, Math.min(59, value));
    this.onTimeChange();
  }

  // ========== 私有方法 ==========

  private initializeTime(): void {
    const now = new Date();
    this.hours = now.getHours();
    this.minutes = now.getMinutes();
    this.seconds = now.getSeconds();
  }

  private applyTimeToDate(): void {
    if (this.selectedDate) {
      this.selectedDate.setHours(this.hours, this.minutes, this.seconds);
    }
  }

  private updateInputText(): void {
    if (!this.selectedDate) {
      this.inputText = '';
      return;
    }

    const dateStr = this.formatDate(this.selectedDate);
    const timeStr = this.showTime ? this.formatTime() : '';

    this.inputText = this.showTime ? `${dateStr} ${timeStr}` : dateStr;
    this.cdr.markForCheck();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(): string {
    const h = String(this.hours).padStart(2, '0');
    const m = String(this.minutes).padStart(2, '0');
    const s = String(this.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // 辅助方法：格式化显示值
  get displayValue(): string {
    return this.inputText;
  }

  // 检查是否可以清除
  get canClear(): boolean {
    return this.allowClear && !!this.selectedDate && !this.disabled && !this.readonly;
  }

  // 时间输入框的步进值
  get hoursStep(): number {
    return 1;
  }

  get minutesStep(): number {
    return 1;
  }

  get secondsStep(): number {
    return 1;
  }
}