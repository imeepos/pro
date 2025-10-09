import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

export type TimePreset = 'current' | 'workStart' | 'workEnd' | 'noon' | 'midnight';
export type QuickPreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth';

export interface TimeValue {
  hours: number;
  minutes: number;
  seconds?: number;
}

@Component({
  selector: 'pro-date-time-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimePickerComponent),
      multi: true
    }
  ],
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DateTimePickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // 基础配置
  @Input() placeholder = '请选择日期时间';
  @Input() disabled = false;
  @Input() required = false;
  @Input() readonly = false;

  // 日期限制
  @Input() minDate?: Date;
  @Input() maxDate?: Date;

  // 时间配置
  @Input() showSeconds = false;
  @Input() hour24Format = true;
  @Input() timeStep = 1;

  // 功能开关
  @Input() showQuickPresets = true;
  @Input() showTimePresets = true;
  @Input() allowClear = true;

  // 格式化
  @Input() dateFormat = 'YYYY-MM-DD';
  @Input() timeFormat = 'HH:mm:ss';

  // 事件输出
  @Output() dateChange = new EventEmitter<Date | null>();
  @Output() dateSelect = new EventEmitter<Date | null>();
  @Output() timeChange = new EventEmitter<TimeValue>();
  @Output() open = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  // 内部状态
  selectedDate: Date | null = null;
  isOpen = false;
  currentDate = new Date();
  hoveredDate: Date | null = null;
  inputText = '';

  // 时间相关状态
  selectedTime: TimeValue = { hours: 0, minutes: 0, seconds: 0 };
  activeTimeInput: 'hours' | 'minutes' | 'seconds' | null = null;

  // 快捷预设
  quickPresets = [
    { key: 'today' as QuickPreset, label: '今天', icon: '📅' },
    { key: 'yesterday' as QuickPreset, label: '昨天', icon: '📆' },
    { key: 'last7days' as QuickPreset, label: '最近7天', icon: '📊' },
    { key: 'last30days' as QuickPreset, label: '最近30天', icon: '📈' },
    { key: 'thisMonth' as QuickPreset, label: '本月', icon: '🗓️' },
    { key: 'lastMonth' as QuickPreset, label: '上月', icon: '📋' }
  ];

  // 时间预设
  timePresets = [
    { key: 'current' as TimePreset, label: '当前时间', time: null },
    { key: 'workStart' as TimePreset, label: '上班时间', time: { hours: 9, minutes: 0, seconds: 0 } },
    { key: 'workEnd' as TimePreset, label: '下班时间', time: { hours: 18, minutes: 0, seconds: 0 } },
    { key: 'noon' as TimePreset, label: '中午', time: { hours: 12, minutes: 0, seconds: 0 } },
    { key: 'midnight' as TimePreset, label: '午夜', time: { hours: 0, minutes: 0, seconds: 0 } }
  ];

  // ControlValueAccessor 回调
  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    this.bindDocumentClick();
  }

  ngOnInit(): void {
    this.initializeCurrentDate();
    this.initializeTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.unbindDocumentClick();
  }

  // ========== ControlValueAccessor 接口实现 ==========

  writeValue(value: Date | null): void {
    if (value) {
      this.selectedDate = new Date(value);
      this.selectedTime = {
        hours: value.getHours(),
        minutes: value.getMinutes(),
        seconds: value.getSeconds()
      };
      this.updateInputText();
    } else {
      this.clearSelection();
    }
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ========== 公共方法 ==========

  openPicker(): void {
    if (this.disabled || this.readonly) return;
    this.isOpen = true;
    this.open.emit();
    this.onTouched();
  }

  closePicker(): void {
    this.isOpen = false;
    this.hoveredDate = null;
    this.close.emit();
  }

  togglePicker(): void {
    if (this.disabled || this.readonly) return;
    if (this.isOpen) {
      this.closePicker();
    } else {
      this.openPicker();
    }
  }

  clearSelection(): void {
    this.selectedDate = null;
    this.inputText = '';
    this.initializeTime();
    this.onChange(null);
    this.dateChange.emit(null);
  }

  // ========== 日期选择相关 ==========

  selectDate(date: Date | null): void {
    if (!date || this.isDateDisabled(date)) return;

    this.selectedDate = new Date(date);
    this.applyTimeToDate();
    this.updateInputText();
    this.onChange(this.selectedDate);
    this.dateChange.emit(this.selectedDate);
    this.dateSelect.emit(this.selectedDate);
  }

  selectQuickPreset(preset: QuickPreset): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let date: Date;

    switch (preset) {
      case 'today':
        date = new Date(today);
        break;
      case 'yesterday':
        date = new Date(today);
        date.setDate(date.getDate() - 1);
        break;
      case 'last7days':
        date = new Date(today);
        date.setDate(date.getDate() - 7);
        break;
      case 'last30days':
        date = new Date(today);
        date.setDate(date.getDate() - 30);
        break;
      case 'thisMonth':
        date = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        date = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        break;
      default:
        date = new Date(today);
    }

    // 应用当前时间设置
    date.setHours(
      this.selectedTime.hours,
      this.selectedTime.minutes,
      this.selectedTime.seconds || 0
    );

    this.selectDate(date);
  }

  // ========== 时间选择相关 ==========

  selectTimePreset(preset: TimePreset): void {
    let time: TimeValue;

    if (preset === 'current') {
      const now = new Date();
      time = {
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: this.showSeconds ? now.getSeconds() : 0
      };
    } else {
      const presetTime = this.timePresets.find(p => p.key === preset)?.time;
      if (presetTime) {
        time = { ...presetTime };
      } else {
        return;
      }
    }

    this.selectedTime = time;
    this.updateDateTime();
    this.timeChange.emit(time);
  }

  updateTime(type: 'hours' | 'minutes' | 'seconds', value: number): void {
    switch (type) {
      case 'hours':
        this.updateHours(value);
        break;
      case 'minutes':
        this.updateMinutes(value);
        break;
      case 'seconds':
        this.updateSeconds(value);
        break;
    }
  }

  incrementTime(type: 'hours' | 'minutes' | 'seconds'): void {
    switch (type) {
      case 'hours':
        const maxHours = this.hour24Format ? 23 : 12;
        const minHours = this.hour24Format ? 0 : 1;
        const newHours = this.selectedTime.hours + 1 > maxHours ? minHours : this.selectedTime.hours + 1;
        this.updateHours(newHours);
        break;
      case 'minutes':
        const newMinutes = this.selectedTime.minutes + this.timeStep;
        this.updateMinutes(newMinutes > 59 ? 0 : newMinutes);
        break;
      case 'seconds':
        const newSeconds = (this.selectedTime.seconds || 0) + 1;
        this.updateSeconds(newSeconds > 59 ? 0 : newSeconds);
        break;
    }
  }

  decrementTime(type: 'hours' | 'minutes' | 'seconds'): void {
    switch (type) {
      case 'hours':
        const maxHours = this.hour24Format ? 23 : 12;
        const minHours = this.hour24Format ? 0 : 1;
        const newHours = this.selectedTime.hours - 1 < minHours ? maxHours : this.selectedTime.hours - 1;
        this.updateHours(newHours);
        break;
      case 'minutes':
        const newMinutes = this.selectedTime.minutes - this.timeStep;
        this.updateMinutes(newMinutes < 0 ? 60 - this.timeStep : newMinutes);
        break;
      case 'seconds':
        const newSeconds = (this.selectedTime.seconds || 0) - 1;
        this.updateSeconds(newSeconds < 0 ? 59 : newSeconds);
        break;
    }
  }

  toggleAmPm(): void {
    if (this.hour24Format) return;

    const currentHours = this.selectedTime.hours;
    if (currentHours >= 12) {
      this.selectedTime.hours = currentHours - 12;
    } else {
      this.selectedTime.hours = currentHours + 12;
    }
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  // ========== 导航方法 ==========

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentDate = new Date(this.currentDate);
  }

  // ========== 输入处理 ==========

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputText = target.value;

    if (this.inputText) {
      const parsedDate = this.parseInputDateTime(this.inputText);
      if (parsedDate && !this.isDateDisabled(parsedDate)) {
        this.selectedDate = parsedDate;
        this.selectedTime = {
          hours: parsedDate.getHours(),
          minutes: parsedDate.getMinutes(),
          seconds: parsedDate.getSeconds()
        };
        this.onChange(this.selectedDate);
        this.dateChange.emit(this.selectedDate);
      }
    } else {
      this.clearSelection();
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled || this.readonly) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openPicker();
        break;
      case 'Escape':
        this.closePicker();
        break;
    }
  }

  onTimeInputKeyDown(event: KeyboardEvent, type: 'hours' | 'minutes' | 'seconds'): void {
    const input = event.target as HTMLInputElement;
    let value = parseInt(input.value) || 0;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this.incrementTime(type);
        break;
      case 'ArrowDown':
        event.preventDefault();
        this.decrementTime(type);
        break;
      case 'Enter':
        event.preventDefault();
        this.updateTime(type, value);
        break;
      case 'Tab':
        this.updateTime(type, value);
        break;
    }
  }

  // ========== 工具方法 ==========

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  isSelected(date: Date | null): boolean {
    if (!this.selectedDate || !date) return false;
    return date.getDate() === this.selectedDate.getDate() &&
           date.getMonth() === this.selectedDate.getMonth() &&
           date.getFullYear() === this.selectedDate.getFullYear();
  }

  isCurrentMonth(date: Date | null): boolean {
    if (!date) return false;
    return date.getMonth() === this.currentDate.getMonth() &&
           date.getFullYear() === this.currentDate.getFullYear();
  }

  isDateDisabled(date: Date | null): boolean {
    if (!date || this.disabled) return true;

    if (this.maxDate && date > this.maxDate) return true;
    if (this.minDate && date < this.minDate) return true;

    return false;
  }

  isAm(): boolean {
    if (this.hour24Format) return true;
    return this.selectedTime.hours < 12;
  }

  getDisplayHours(): number {
    if (this.hour24Format) {
      return this.selectedTime.hours;
    }

    const hours = this.selectedTime.hours;
    if (hours === 0) return 12;
    if (hours > 12) return hours - 12;
    return hours;
  }

  getCalendarDays(): (Date | null)[] {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // 上月日期填充
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthLastDay.getDate() - i));
    }

    // 当月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // 下月日期填充
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  getMonthName(): string {
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    return `${this.currentDate.getFullYear()}年 ${months[this.currentDate.getMonth()]}`;
  }

  getWeekDays(): string[] {
    return ['日', '一', '二', '三', '四', '五', '六'];
  }

  formatDateTime(): string {
    if (!this.selectedDate) return '';

    const dateStr = this.formatDate(this.selectedDate);
    const timeStr = this.formatTime();

    return `${dateStr} ${timeStr}`;
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatTime(): string {
    const hours = this.getDisplayHours();
    const minutes = String(this.selectedTime.minutes).padStart(2, '0');
    const seconds = String(this.selectedTime.seconds || 0).padStart(2, '0');

    let timeString = `${String(hours).padStart(2, '0')}:${minutes}`;
    if (this.showSeconds) {
      timeString += `:${seconds}`;
    }

    if (!this.hour24Format) {
      timeString += ` ${this.isAm() ? 'AM' : 'PM'}`;
    }

    return timeString;
  }

  getQuickPresetRange(preset: QuickPreset): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'today':
        return this.formatDate(today);
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return this.formatDate(yesterday);
      case 'last7days':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return `${this.formatDate(weekAgo)} ~ ${this.formatDate(today)}`;
      case 'last30days':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        return `${this.formatDate(monthAgo)} ~ ${this.formatDate(today)}`;
      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return `${this.formatDate(thisMonthStart)} ~ ${this.formatDate(today)}`;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return `${this.formatDate(lastMonthStart)} ~ ${this.formatDate(lastMonthEnd)}`;
      default:
        return '';
    }
  }

  getAriaLabelForDate(date: Date | null): string {
    if (!date) return '';

    const isToday = this.isToday(date);
    const isSelected = this.isSelected(date);
    const isDisabled = this.isDateDisabled(date);
    const isOtherMonth = !this.isCurrentMonth(date);

    let label = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

    if (isToday) label += '，今天';
    if (isSelected) label += '，已选中';
    if (isOtherMonth) label += '，其他月份';
    if (isDisabled) label += '，不可选择';

    return label;
  }

  // ========== 私有方法 ==========

  private initializeCurrentDate(): void {
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
  }

  private initializeTime(): void {
    const now = new Date();
    this.selectedTime = {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: this.showSeconds ? now.getSeconds() : 0
    };
  }

  private updateHours(hours: number): void {
    if (this.hour24Format) {
      hours = Math.max(0, Math.min(23, hours));
    } else {
      hours = Math.max(1, Math.min(12, hours));
    }
    this.selectedTime.hours = hours;
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  private updateMinutes(minutes: number): void {
    const steppedMinutes = Math.floor(minutes / this.timeStep) * this.timeStep;
    this.selectedTime.minutes = Math.max(0, Math.min(59, steppedMinutes));
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  private updateSeconds(seconds: number): void {
    this.selectedTime.seconds = Math.max(0, Math.min(59, seconds));
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  private applyTimeToDate(): void {
    if (this.selectedDate) {
      this.selectedDate.setHours(
        this.selectedTime.hours,
        this.selectedTime.minutes,
        this.selectedTime.seconds || 0
      );
    }
  }

  private updateDateTime(): void {
    if (this.selectedDate) {
      this.applyTimeToDate();
      this.updateInputText();
      this.onChange(this.selectedDate);
      this.dateChange.emit(this.selectedDate);
    }
  }

  private updateInputText(): void {
    this.inputText = this.formatDateTime();
  }

  private parseInputDateTime(input: string): Date | null {
    const dateTimeRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s+(AM|PM))?$/i;
    const match = input.match(dateTimeRegex);

    if (match) {
      let [, year, month, day, hoursStr, minutesStr, secondsStr, ampm] = match;
      let hours = parseInt(hoursStr);
      const minutes = parseInt(minutesStr);
      const seconds = secondsStr ? parseInt(secondsStr) : 0;

      // 处理12小时制
      if (ampm && !this.hour24Format) {
        const upperAmpm = ampm.toUpperCase();
        if (upperAmpm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (upperAmpm === 'AM' && hours === 12) {
          hours = 0;
        }
      }

      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, minutes, seconds);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  private bindDocumentClick(): void {
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  private unbindDocumentClick(): void {
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  private handleDocumentClick(event: Event): void {
    const target = event.target as Element;
    if (!target.closest('.date-time-picker')) {
      this.closePicker();
    }
  }

  // 公共工具方法
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  trackByDate(index: number, date: Date | null): string {
    if (!date) return `null-${index}`;
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  onDateHover(date: Date | null | undefined): void {
    this.hoveredDate = date || null;
  }

  isDateHovered(date: Date | null): boolean {
    if (!this.hoveredDate || !date) return false;
    return date.getDate() === this.hoveredDate.getDate() &&
           date.getMonth() === this.hoveredDate.getMonth() &&
           date.getFullYear() === this.hoveredDate.getFullYear();
  }

  onTimeInputFocus(type: 'hours' | 'minutes' | 'seconds'): void {
    this.activeTimeInput = type;
  }

  onTimeInputBlur(event: FocusEvent, type: 'hours' | 'minutes' | 'seconds'): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    this.updateTime(type, value);
    this.activeTimeInput = null;
  }
}