import { Component, Input, Output, EventEmitter, forwardRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

export interface DateRange {
  start: Date;
  end: Date;
}

export type QuickPreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth';

export type DatePickerMode = 'date' | 'time' | 'datetime';

export type TimePreset = 'current' | 'workStart' | 'workEnd' | 'noon' | 'midnight';

export interface TimeValue {
  hours: number;
  minutes: number;
  seconds?: number;
}

export interface DateTimeValue extends TimeValue {
  year: number;
  month: number;
  day: number;
}

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
  @Input() format = 'y-MM-dd';

  // 时间选择相关配置
  @Input() mode: DatePickerMode = 'date';
  @Input() showSeconds = false;
  @Input() hour24Format = true;
  @Input() showTimePresets = true;
  @Input() timeStep = 1; // 分钟步长

  @Output() dateChange = new EventEmitter<Date | null>();
  @Output() dateSelect = new EventEmitter<Date | null>();
  @Output() timeChange = new EventEmitter<TimeValue | null>();

  // 公开的选中日期
  selectedDate: Date | null = null;

  // 内部状态
  isOpen = false;
  currentDate = new Date();
  hoveredDate: Date | null = null;
  inputText = '';
  isLoading = false;

  // 时间选择相关状态
  selectedTime: TimeValue = { hours: 0, minutes: 0, seconds: 0 };
  timePanelVisible = false;
  activeTimeInput: 'hours' | 'minutes' | 'seconds' | null = null;

  // 快捷预设选项
  quickPresets = [
    { key: 'today' as QuickPreset, label: '今天', icon: '📅' },
    { key: 'yesterday' as QuickPreset, label: '昨天', icon: '📆' },
    { key: 'last7days' as QuickPreset, label: '最近7天', icon: '📊' },
    { key: 'last30days' as QuickPreset, label: '最近30天', icon: '📈' },
    { key: 'thisMonth' as QuickPreset, label: '本月', icon: '🗓️' },
    { key: 'lastMonth' as QuickPreset, label: '上月', icon: '📋' }
  ];

  // 时间预设选项
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

  // 暴露 parseInt 给模板使用
  protected readonly parseInt = parseInt;

  constructor() {
    // 点击外部关闭弹窗
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  ngOnInit(): void {
    // 设置当前日期为今天的开始时间
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);

    // 初始化时间
    this.initializeTime();
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
      this.selectedTime = {
        hours: value.getHours(),
        minutes: value.getMinutes(),
        seconds: value.getSeconds()
      };
      this.updateInputText();
    } else {
      this.selectedDate = null;
      this.inputText = '';
      this.initializeTime();
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
    if (!target.closest('.relative')) {
      this.closeCalendar();
    }
  }

  // 日期选择
  selectDate(date: Date | null): void {
    if (!date || this.isDateDisabled(date)) return;

    this.selectedDate = new Date(date);

    // 如果是日期时间模式，设置时间到选中的日期
    if (this.mode === 'datetime') {
      this.selectedDate.setHours(
        this.selectedTime.hours,
        this.selectedTime.minutes,
        this.selectedTime.seconds || 0
      );
    } else if (this.mode === 'date') {
      // 纯日期模式，重置时间为一天的开始
      this.selectedDate.setHours(0, 0, 0, 0);
    }

    this.updateInputText();

    // 仅在日期模式或日期时间模式下关闭日历
    if (this.mode !== 'time') {
      this.closeCalendar();
    }

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

    // 如果是日期时间模式，设置当前时间
    if (this.mode === 'datetime') {
      const now = new Date();
      date.setHours(
        this.selectedTime.hours,
        this.selectedTime.minutes,
        this.selectedTime.seconds || 0
      );
    } else if (this.mode === 'time') {
      // 纯时间模式，使用今天作为日期基准
      const now = new Date();
      date.setHours(
        this.selectedTime.hours,
        this.selectedTime.minutes,
        this.selectedTime.seconds || 0
      );
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

  // 用于 trackBy 的方法，提高性能
  trackByDate(index: number, date: Date | null): string {
    if (!date) return `null-${index}`;
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  // 获取日期的 ARIA 标签，提升可访问性
  getAriaLabelForDate(date: Date | null): string {
    if (!date) return '';

    const today = new Date();
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

  // 改进的悬停检查方法
  isDateHovered(date: Date | null): boolean {
    return this.isHovered(date);
  }

  // ========== 时间选择相关方法 ==========

  // 初始化时间
  private initializeTime(): void {
    const now = new Date();
    this.selectedTime = {
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: this.showSeconds ? now.getSeconds() : 0
    };
  }

  // 切换时间面板显示
  toggleTimePanel(): void {
    this.timePanelVisible = !this.timePanelVisible;
  }

  // 显示时间面板
  showTimePanel(): void {
    this.timePanelVisible = true;
  }

  // 隐藏时间面板
  hideTimePanel(): void {
    this.timePanelVisible = false;
    this.activeTimeInput = null;
  }

  // 时间选择
  selectTime(preset: TimePreset): void {
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

  // 更新小时
  updateHours(hours: number): void {
    if (this.hour24Format) {
      hours = Math.max(0, Math.min(23, hours));
    } else {
      hours = Math.max(1, Math.min(12, hours));
    }
    this.selectedTime.hours = hours;
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  // 更新分钟
  updateMinutes(minutes: number): void {
    // 根据步长调整
    const steppedMinutes = Math.floor(minutes / this.timeStep) * this.timeStep;
    this.selectedTime.minutes = Math.max(0, Math.min(59, steppedMinutes));
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  // 更新秒数
  updateSeconds(seconds: number): void {
    this.selectedTime.seconds = Math.max(0, Math.min(59, seconds));
    this.updateDateTime();
    this.timeChange.emit(this.selectedTime);
  }

  // 时间输入框键盘事件
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
        this.applyTimeInput(type, value);
        break;
      case 'Tab':
        this.applyTimeInput(type, value);
        // Tab 键自然切换到下一个输入框
        break;
    }
  }

  // 时间输入框失焦事件
  onTimeInputBlur(event: FocusEvent, type: 'hours' | 'minutes' | 'seconds'): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    this.applyTimeInput(type, value);
    this.activeTimeInput = null;
  }

  // 时间输入框获得焦点
  onTimeInputFocus(type: 'hours' | 'minutes' | 'seconds'): void {
    this.activeTimeInput = type;
  }

  // 应用时间输入
  private applyTimeInput(type: 'hours' | 'minutes' | 'seconds', value: number): void {
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

  // 增加时间
  incrementTime(type: 'hours' | 'minutes' | 'seconds'): void {
    switch (type) {
      case 'hours':
        const maxHours = this.hour24Format ? 23 : 12;
        const newHours = this.selectedTime.hours + 1 > maxHours ? 0 : this.selectedTime.hours + 1;
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

  // 减少时间
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

  // 切换 AM/PM（仅12小时制）
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

  // 判断是否为 AM（仅12小时制）
  isAm(): boolean {
    if (this.hour24Format) return true;
    return this.selectedTime.hours < 12;
  }

  // 获取显示的小时（12小时制）
  getDisplayHours(): number {
    if (this.hour24Format) {
      return this.selectedTime.hours;
    }

    const hours = this.selectedTime.hours;
    if (hours === 0) return 12;
    if (hours > 12) return hours - 12;
    return hours;
  }

  // 格式化时间显示
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

  // 更新日期时间
  private updateDateTime(): void {
    if (this.selectedDate) {
      const newDate = new Date(this.selectedDate);
      newDate.setHours(this.selectedTime.hours, this.selectedTime.minutes, this.selectedTime.seconds || 0);
      this.selectedDate = newDate;
      this.updateInputText();
      this.onChange(this.selectedDate);
      this.dateChange.emit(this.selectedDate);
    } else if (this.mode === 'time') {
      // 纯时间模式下，如果没有选中日期，使用今天的日期
      const today = new Date();
      today.setHours(this.selectedTime.hours, this.selectedTime.minutes, this.selectedTime.seconds || 0);
      this.selectedDate = today;
      this.updateInputText();
      this.onChange(this.selectedDate);
      this.dateChange.emit(this.selectedDate);
    }
  }

  // 更新输入框文本（支持时间）
  private updateInputText(): void {
    if (!this.selectedDate) {
      this.inputText = '';
      return;
    }

    const dateStr = this.formatDate(this.selectedDate);

    if (this.mode === 'datetime') {
      this.inputText = `${dateStr} ${this.formatTime()}`;
    } else if (this.mode === 'time') {
      this.inputText = this.formatTime();
    } else {
      this.inputText = dateStr;
    }
  }

  // 解析输入的日期时间（支持时间）
  private parseInputDate(input: string): Date | null {
    if (this.mode === 'time') {
      return this.parseTimeInput(input);
    }

    // 先尝试解析日期时间格式
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

    // 回退到原有的日期解析逻辑
    return this.parseDateOnly(input);
  }

  // 解析纯日期
  private parseDateOnly(input: string): Date | null {
    const formats = [
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
    ];

    for (const format of formats) {
      const match = input.match(format);
      if (match) {
        let year, month, day;

        if (format === formats[0] || format === formats[1]) {
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          year = parseInt(match[3]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[1]);
        }

        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          date.setHours(this.selectedTime.hours, this.selectedTime.minutes, this.selectedTime.seconds || 0);
          return date;
        }
      }
    }

    return null;
  }

  // 解析时间输入
  private parseTimeInput(input: string): Date | null {
    const timeRegex = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s+(AM|PM))?$/i;
    const match = input.match(timeRegex);

    if (!match) return null;

    let [, hoursStr, minutesStr, secondsStr, ampm] = match;
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

    // 验证时间范围
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
      return null;
    }

    // 使用当前日期加上解析的时间
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  // 获取时间预设的标签
  getTimePresetLabel(preset: TimePreset): string {
    const timePreset = this.timePresets.find(p => p.key === preset);
    return timePreset?.label || '';
  }

  // 生成小时选项
  generateHourOptions(): number[] {
    if (this.hour24Format) {
      return Array.from({ length: 24 }, (_, i) => i);
    } else {
      return Array.from({ length: 12 }, (_, i) => i + 1);
    }
  }

  // 生成分钟选项
  generateMinuteOptions(): number[] {
    const options: number[] = [];
    for (let i = 0; i < 60; i += this.timeStep) {
      options.push(i);
    }
    return options;
  }

  // 生成秒数选项
  generateSecondOptions(): number[] {
    return Array.from({ length: 60 }, (_, i) => i);
  }

  // 时间面板键盘导航
  onTimePanelKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.hideTimePanel();
        break;
      case 'Tab':
        // Tab 键自然切换焦点
        break;
      default:
        // 其他键交给输入框处理
        break;
    }
  }

  // 验证时间输入
  validateTimeInput(type: 'hours' | 'minutes' | 'seconds', value: string): boolean {
    const numValue = parseInt(value);

    switch (type) {
      case 'hours':
        if (this.hour24Format) {
          return numValue >= 0 && numValue <= 23;
        } else {
          return numValue >= 1 && numValue <= 12;
        }
      case 'minutes':
      case 'seconds':
        return numValue >= 0 && numValue <= 59;
      default:
        return false;
    }
  }

  // 获取占位符文本
  getPlaceholderText(): string {
    if (this.placeholder !== '请选择日期') {
      return this.placeholder;
    }

    switch (this.mode) {
      case 'time':
        return this.showSeconds ? '请选择时间 (HH:MM:SS)' : '请选择时间 (HH:MM)';
      case 'datetime':
        return this.showSeconds ? '请选择日期时间 (y-MM-dd HH:MM:SS)' : '请选择日期时间 (y-MM-dd HH:MM)';
      default:
        return '请选择日期';
    }
  }

  // 检查是否应该显示时间面板
  shouldShowTimePanel(): boolean {
    return this.mode === 'time' || (this.mode === 'datetime' && this.timePanelVisible);
  }

  // 检查是否应该显示日期面板
  shouldShowDatePanel(): boolean {
    return this.mode === 'date' || this.mode === 'datetime';
  }
}