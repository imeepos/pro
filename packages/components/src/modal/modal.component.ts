import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pro-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" [class]="overlayClasses" (click)="handleOverlayClick($event)">
      <!-- Center trick for vertical alignment -->
      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <!-- Modal Panel -->
      <div
        [class]="modalClasses"
        [style.max-width]="width"
        (click)="$event.stopPropagation()"
        role="dialog"
        [attr.aria-modal]="visible"
        [attr.aria-labelledby]="title ? titleId : null"
        [attr.aria-describedby]="contentId">

        <!-- Modal Header -->
        <div *ngIf="title || showCloseButton" class="modal-header">
          <div class="flex items-center justify-between">
            <h3 *ngIf="title" [id]="titleId" class="modal-title">{{ title }}</h3>
            <button
              *ngIf="showCloseButton"
              type="button"
              [class]="closeButtonClasses"
              (click)="handleClose()"
              [attr.aria-label]="closeButtonAriaLabel">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Modal Body -->
        <div [id]="contentId" class="modal-body">
          <ng-content></ng-content>
        </div>

        <!-- Modal Footer -->
        <div *ngIf="showFooter" class="modal-footer">
          <ng-content select="[footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      animation: fadeIn 0.2s ease-out;
    }

    .modal-panel {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -48%) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    @media (min-width: 640px) {
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translate(0, -48%) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translate(0, -50%) scale(1);
        }
      }
    }
  `]
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() width = '32rem';
  @Input() closable = true;
  @Input() maskClosable = true;
  @Input() centered = false;
  @Input() showCloseButton = true;
  @Input() showFooter = false;
  @Input() closeButtonAriaLabel = '关闭对话框';
  @Input() zIndex = 50;
  @Input() backdrop = true;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() close = new EventEmitter<void>();
  @Output() open = new EventEmitter<void>();

  titleId = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
  contentId = `modal-content-${Math.random().toString(36).substr(2, 9)}`;

  constructor(private cdr: ChangeDetectorRef) {}

  get overlayClasses(): string {
    const baseClasses = [
      'fixed inset-0 overflow-y-auto',
      'flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0'
    ];

    if (this.backdrop) {
      baseClasses.push('bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75');
    }

    baseClasses.push(`z-${this.zIndex}`);

    return baseClasses.join(' ');
  }

  get modalClasses(): string {
    const baseClasses = [
      'inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all',
      'sm:my-8 sm:align-middle sm:w-full'
    ];

    if (this.centered) {
      baseClasses.push('sm:my-auto');
    }

    return baseClasses.join(' ');
  }

  get closeButtonClasses(): string {
    return [
      'text-gray-400 hover:text-gray-500 dark:hover:text-gray-300',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800',
      'transition-colors duration-200'
    ].join(' ');
  }

  @HostListener('keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.visible && this.closable) {
      event.preventDefault();
      this.handleClose();
    }
  }

  handleOverlayClick(event: MouseEvent): void {
    if (this.maskClosable && this.closable) {
      // Only close if clicking on the overlay itself, not on children
      if (event.target === event.currentTarget) {
        this.handleClose();
      }
    }
  }

  handleClose(): void {
    if (this.closable) {
      this.visible = false;
      this.visibleChange.emit(false);
      this.close.emit();
    }
  }

  openModal(): void {
    this.visible = true;
    this.visibleChange.emit(true);
    this.open.emit();
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.handleClose();
  }
}

// Add custom styles to the component
const modalStyles = `
.modal-header {
  @apply px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200 dark:border-gray-700;
}

.modal-title {
  @apply text-lg font-semibold text-gray-900 dark:text-white;
}

.modal-body {
  @apply px-4 pt-5 pb-4 sm:p-6 sm:pb-4;
}

.modal-footer {
  @apply px-4 py-3 sm:px-6 sm:py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700;
}
`;

// Export styles for external use if needed
export { modalStyles };