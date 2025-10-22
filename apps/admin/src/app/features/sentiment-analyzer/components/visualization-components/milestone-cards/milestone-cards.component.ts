import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MilestoneInsight } from '../../../models/analysis-result.model';

@Component({
  selector: 'milestone-cards',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './milestone-cards.component.html',
  styleUrls: ['./milestone-cards.component.scss']
})
export class MilestoneCardsComponent {
  @Input({ required: true }) milestones: readonly MilestoneInsight[] | null = null;
}
