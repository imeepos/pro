import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'sentiment-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule],
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent {
  @Input() placeholder = '描述你想分析的舆情事件...';
  @Input() disabled = false;
  @Input() busy = false;
  @Output() send = new EventEmitter<string>();
  @Output() upload = new EventEmitter<File>();

  @ViewChild('fileInput', { static: false })
  private fileInput?: ElementRef<HTMLInputElement>;

  draft = '';

  onSend(): void {
    const content = this.draft.trim();
    if (!content || this.disabled || this.busy) {
      return;
    }

    this.send.emit(content);
    this.draft = '';
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) {
      return;
    }

    const [file] = Array.from(files);
    this.upload.emit(file);
    input.value = '';
  }

  triggerFileDialog(): void {
    this.fileInput?.nativeElement.click();
  }
}
