import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

export interface DateRange {
  start: Date;
  end: Date;
}

export type QuickPreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth';

@Component({
  selector: 'pro-date-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  templateUrl: './date-picker.component.html',
  styleUrls: ['./date-picker.component.scss']
})
export class DatePickerComponent implements ControlValueAccessor, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() placeholder = '请选择日期';
  @Input() maxDate?: Date;
  @Input() minDate?: Date;
  @Input() showQuickPresets = true;
  @Input() disabled = false;
  @Input() format = 'YYYY-MM-DD';

  @Output() dateChange = new EventEmitter<Date | null>();
  @Output() dateSelect = new EventEmitter<Date | null>();

  // 公开的选中日期
  selectedDate: Date | null = null;

  // 内部状态
  isOpen = false;
  currentDate = new Date();
  hoveredDate: Date | null = null;
  inputText = '';

  // 快捷预设选项
  quickPresets = [
    { key: 'today' as QuickPreset, label: '今天', icon: '📅' },
    { key: 'yesterday' as QuickPreset, label: '昨天', icon: '📆' },
    { key: 'last7days' as QuickPreset, label: '最近7天', icon: '📊' },
    { key: 'last30days' as QuickPreset, label: '最近30天', icon: '📈' },
    { key: 'thisMonth' as QuickPreset, label: '本月', icon: '🗓️' },
    { key: 'lastMonth' as QuickPreset, label: '上月', icon: '📋' }
  ];

  // ControlValueAccessor 回调
  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // 点击外部关闭弹窗
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  ngOnInit(): void {
    // 设置当前日期为今天的开始时间
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
  }

  // ControlValueAccessor 接口实现
  writeValue(value: Date | null): void {
    if (value) {
      this.selectedDate = new Date(value);
      this.updateInputText();
    } else {
      this.selectedDate = null;
      this.inputText = '';
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

  // 打开/关闭日期选择器
  toggleCalendar(): void {
    if (this.disabled) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
    }
  }

  openCalendar(): void {
    if (this.disabled) return;
    this.isOpen = true;
    this.onTouched();
  }

  closeCalendar(): void {
    this.isOpen = false;
    this.hoveredDate = null;
  }

  // 点击外部处理
  private handleDocumentClick(event: Event): void {
    const target = event.target as Element;
    if (!target.closest('.pro-date-picker')) {
      this.closeCalendar();
    }
  }

  // 日期选择
  selectDate(date: Date | null): void {
    if (!date || this.isDateDisabled(date)) return;

    this.selectedDate = new Date(date);
    this.updateInputText();
    this.closeCalendar();
    this.onChange(this.selectedDate);
    this.dateChange.emit(this.selectedDate);
    this.dateSelect.emit(this.selectedDate);
  }

  // 快捷预设选择
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

    this.selectDate(date);
  }

  // 输入框处理
  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputText = target.value;

    if (this.inputText) {
      const parsedDate = this.parseInputDate(this.inputText);
      if (parsedDate && !this.isDateDisabled(parsedDate)) {
        this.selectedDate = parsedDate;
        this.onChange(this.selectedDate);
        this.dateChange.emit(this.selectedDate);
      }
    } else {
      this.selectedDate = null;
      this.onChange(null);
      this.dateChange.emit(null);
    }
  }

  onInputBlur(): void {
    this.onTouched();
  }

  // 更新输入框文本
  private updateInputText(): void {
    if (this.selectedDate) {
      this.inputText = this.formatDate(this.selectedDate);
    } else {
      this.inputText = '';
    }
  }

  // 解析输入的日期
  private parseInputDate(input: string): Date | null {
    // 支持多种格式
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/  // DD/MM/YYYY
    ];

    for (const format of formats) {
      const match = input.match(format);
      if (match) {
        let year, month, day;

        if (format === formats[0] || format === formats[1]) {
          // YYYY-MM-DD 或 YYYY/MM/DD
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // DD-MM-YYYY 或 DD/MM/YYYY
          year = parseInt(match[3]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[1]);
        }

        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          date.setHours(0, 0, 0, 0);
          return date;
        }
      }
    }

    return null;
  }

  // 格式化日期显示
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 月份导航
  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentDate = new Date(this.currentDate);
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentDate = new Date(this.currentDate);
  }

  // 生成日历数组
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
    const remainingDays = 42 - days.length; // 6周 × 7天
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }

  // 检查日期是否被禁用
  isDateDisabled(date: Date | null): boolean {
    if (!date || this.disabled) return true;

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (this.maxDate && date > this.maxDate) return true;
    if (this.minDate && date < this.minDate) return true;

    return false;
  }

  // 检查是否为今天
  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  // 检查是否为选中的日期
  isSelected(date: Date | null): boolean {
    if (!this.selectedDate || !date) return false;
    return date.getDate() === this.selectedDate.getDate() &&
           date.getMonth() === this.selectedDate.getMonth() &&
           date.getFullYear() === this.selectedDate.getFullYear();
  }

  // 检查是否为当前月份
  isCurrentMonth(date: Date | null): boolean {
    if (!date) return false;
    return date.getMonth() === this.currentDate.getMonth() &&
           date.getFullYear() === this.currentDate.getFullYear();
  }

  // 检查是否为悬停的日期
  isHovered(date: Date | null): boolean {
    if (!this.hoveredDate || !date) return false;
    return date.getDate() === this.hoveredDate.getDate() &&
           date.getMonth() === this.hoveredDate.getMonth() &&
           date.getFullYear() === this.hoveredDate.getFullYear();
  }

  // 鼠标悬停处理
  onDateHover(date: Date | null | undefined): void {
    this.hoveredDate = date || null;
  }

  // 获取月份名称
  getMonthName(): string {
    const months = [
      '一月', '二月', '三月', '四月', '五月', '六月',
      '七月', '八月', '九月', '十月', '十一月', '十二月'
    ];
    return `${this.currentDate.getFullYear()}年 ${months[this.currentDate.getMonth()]}`;
  }

  // 获取星期名称
  getWeekDays(): string[] {
    return ['日', '一', '二', '三', '四', '五', '六'];
  }

  // 键盘导航
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openCalendar();
        break;
      case 'Escape':
        this.closeCalendar();
        break;
    }
  }

  // 获取快捷预设的日期范围（用于显示提示）
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

  // 清除选择
  clearSelection(): void {
    this.selectedDate = null;
    this.inputText = '';
    this.onChange(null);
    this.dateChange.emit(null);
  }

  // 阻止事件冒泡
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}