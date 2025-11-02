import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { WorkflowDirectoryQuery } from '../data/workflow-directory.query';
import { WorkflowDirectoryService } from '../data/workflow-directory.service';
import { WorkflowSummary } from '../data/workflow-directory.store';

interface WorkflowCardView {
  id: string;
  name: string;
  description: string;
  tags: string[];
  updatedNarrative: string;
  updatedExact: string;
  createdNarrative: string;
  createdExact: string;
}

@Component({
  selector: 'app-workflows-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './workflows-list.component.html',
  styleUrls: ['./workflows-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowsListComponent {
  private readonly router = inject(Router);
  private readonly directoryQuery = inject(WorkflowDirectoryQuery);
  private readonly directoryService = inject(WorkflowDirectoryService);
  private readonly relativeFormatter = new Intl.RelativeTimeFormat('zh-CN', {
    numeric: 'auto',
  });
  private readonly absoluteFormatter = new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hour12: false,
  });

  readonly workflows = toSignal(this.directoryQuery.workflows$, { initialValue: [] });
  readonly loading = toSignal(this.directoryQuery.loading$, { initialValue: false });
  readonly error = toSignal(this.directoryQuery.error$, { initialValue: null });

  readonly cards = computed<WorkflowCardView[]>(() =>
    this.workflows().map((workflow) => this.composeCard(workflow)),
  );

  readonly totalWorkflows = computed(() => this.workflows().length);
  readonly latestUpdateNarrative = computed(() => {
    const entries = this.workflows();
    if (entries.length === 0) {
      return '尚未创建';
    }

    const latest = entries.reduce(
      (current, candidate) =>
        candidate.updatedAt.getTime() > current.updatedAt.getTime() ? candidate : current,
    );

    return this.describeRelative(latest.updatedAt);
  });

  readonly trackById = (_: number, entry: WorkflowCardView) => entry.id;

  constructor() {
    void this.refresh();
  }

  openEditor(id: string): void {
    this.router.navigate(['/workflows', 'editor', id]);
  }

  openMonitor(id: string): void {
    this.router.navigate(['/workflows', 'monitor', id]);
  }

  createWorkflow(): void {
    this.router.navigate(['/workflows', 'editor', 'new']);
  }

  reload(): void {
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    try {
      await this.directoryService.refresh();
    } catch {
      // 错误状态保存在 Store 中，这里无需额外处理
    }
  }

  private composeCard(workflow: WorkflowSummary): WorkflowCardView {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description ?? '这条流程尚未留下简介。',
      tags: workflow.tags,
      updatedNarrative: this.describeRelative(workflow.updatedAt),
      updatedExact: this.absoluteFormatter.format(workflow.updatedAt),
      createdNarrative: this.describeRelative(workflow.createdAt),
      createdExact: this.absoluteFormatter.format(workflow.createdAt),
    };
  }

  private describeRelative(date: Date): string {
    const deltaMilliseconds = date.getTime() - Date.now();
    const deltaSeconds = Math.round(deltaMilliseconds / 1000);

    const absoluteSeconds = Math.abs(deltaSeconds);
    if (absoluteSeconds < 60) {
      return this.relativeFormatter.format(deltaSeconds, 'seconds');
    }

    const deltaMinutes = Math.round(deltaSeconds / 60);
    const absoluteMinutes = Math.abs(deltaMinutes);
    if (absoluteMinutes < 60) {
      return this.relativeFormatter.format(deltaMinutes, 'minutes');
    }

    const deltaHours = Math.round(deltaMinutes / 60);
    const absoluteHours = Math.abs(deltaHours);
    if (absoluteHours < 24) {
      return this.relativeFormatter.format(deltaHours, 'hours');
    }

    const deltaDays = Math.round(deltaHours / 24);
    const absoluteDays = Math.abs(deltaDays);
    if (absoluteDays < 30) {
      return this.relativeFormatter.format(deltaDays, 'days');
    }

    const deltaMonths = Math.round(deltaDays / 30);
    const absoluteMonths = Math.abs(deltaMonths);
    if (absoluteMonths < 18) {
      return this.relativeFormatter.format(deltaMonths, 'months');
    }

    const deltaYears = Math.round(deltaDays / 365);
    return this.relativeFormatter.format(deltaYears, 'years');
  }
}
