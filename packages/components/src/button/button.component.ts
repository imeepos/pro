import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pro-button',
  standalone: true,
  imports: [CommonModule],
  template: `<button [type]="type">{{ label }}</button>`,
  styles: [`
    button {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid #ccc;
      cursor: pointer;
    }
  `]
})
export class ButtonComponent {
  @Input() label = 'Button';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
}
