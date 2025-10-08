import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ToastService, Toast } from '../../services/toast.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.scss']
})
export class ToastContainerComponent {
  toasts$: Observable<Toast[]>;

  constructor(private readonly toastService: ToastService) {
    this.toasts$ = this.toastService.toasts;
  }

  onToastClosed(id: string): void {
    this.toastService.remove(id);
  }

  trackByToastId(_index: number, toast: Toast): string {
    return toast.id;
  }
}
