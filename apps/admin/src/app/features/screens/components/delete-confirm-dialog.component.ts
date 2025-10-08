import { Component, Input, Output, EventEmitter, HostListener, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, transition, state, style, animate } from '@angular/animations';
import { ScreenPage } from '../../../core/services/screen-api.service';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './delete-confirm-dialog.component.html',
  styleUrls: ['./delete-confirm-dialog.component.scss'],
  animations: [
    trigger('slideUp', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(20px) scale(0.95)'
        }),
        animate('300ms ease-out', style({
          opacity: 1,
          transform: 'translateY(0) scale(1)'
        }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({
          opacity: 0,
          transform: 'translateY(-10px) scale(0.95)'
        }))
      ])
    ])
  ]
})
export class DeleteConfirmDialogComponent implements OnInit {
  @Input() screen: ScreenPage | null = null;
  @Input() isVisible = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() visibleChange = new EventEmitter<boolean>();

  confirmName = '';
  isSubmitting = false;
  showAdvancedOptions = false;

  constructor(private datePipe: DatePipe) {}

  ngOnInit(): void {
    this.reset();
  }

  @HostListener('document:keydown.escape')
  onEscapePress(): void {
    if (this.isVisible) {
      this.cancel.emit();
    }
  }

  get isValidName(): boolean {
    return this.confirmName.trim() === this.screen?.name;
  }

  get canDelete(): boolean {
    return this.canPerformDelete();
  }

  get warningType(): string {
    if (this.screen?.status === 'published') {
      return 'published';
    }
    if (this.screen?.isDefault) {
      return 'default';
    }
    return 'normal';
  }

  get warningMessage(): string {
    switch (this.warningType) {
      case 'published':
        return '此页面已发布，删除后将无法访问';
      case 'default':
        return '此页面是默认页面，删除后需要设置新的默认页面';
      default:
        return '此操作不可恢复，请谨慎操作';
    }
  }

  onConfirm(): void {
    if (!this.canDelete) return;

    // 双重确认检查
    if (!this.screen || this.confirmName.trim() !== this.screen.name) {
      this.cancel.emit();
      return;
    }

    this.isSubmitting = true;
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.onCancel();
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return this.datePipe.transform(dateStr, 'yyyy-MM-dd HH:mm') || '-';
  }

  // 额外的安全性验证
validateScreenData(): boolean {
  if (!this.screen) return false;
  if (!this.screen.id || this.screen.id.trim() === '') return false;
  if (!this.screen.name || this.screen.name.trim() === '') return false;
  return true;
}

// 检查是否可以删除
canPerformDelete(): boolean {
  if (!this.validateScreenData()) return false;
  if (this.isSubmitting) return false;
  if (!this.isValidName) return false;
  return true;
}

reset(): void {
    this.confirmName = '';
    this.isSubmitting = false;
    this.showAdvancedOptions = false;
  }
}