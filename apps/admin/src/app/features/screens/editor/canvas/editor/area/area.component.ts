import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rect } from '../../../models/component.model';

@Component({
  selector: 'app-area',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './area.component.html',
  styleUrls: ['./area.component.scss']
})
export class AreaComponent {
  @Input() rect?: Rect;
  @Input() selectedCount: number = 0;

  get showCount(): boolean {
    return this.selectedCount > 0;
  }
}
