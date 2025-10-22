import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KeywordInsight } from '../../../models/analysis-result.model';

interface CloudWord extends KeywordInsight {
  readonly fontSize: number;
  readonly opacity: number;
}

@Component({
  selector: 'keyword-cloud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyword-cloud.component.html',
  styleUrls: ['./keyword-cloud.component.scss']
})
export class KeywordCloudComponent {
  @Input({ required: true }) keywords: readonly KeywordInsight[] | null = null;

  readonly cloudWords = computed<readonly CloudWord[]>(() => {
    if (!this.keywords || this.keywords.length === 0) {
      return [];
    }

    const maxWeight = Math.max(...this.keywords.map((entry) => entry.weight), 1);

    return this.keywords.map((entry) => {
      const ratio = entry.weight / maxWeight;
      return {
        ...entry,
        fontSize: 0.85 + ratio * 1.2,
        opacity: 0.45 + ratio * 0.5
      };
    });
  });
}
