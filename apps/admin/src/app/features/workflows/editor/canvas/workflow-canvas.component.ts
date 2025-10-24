import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WorkflowQuery } from '../services/workflow.query';
import { X6AdapterService } from '../services/x6-adapter.service';

@Component({
  selector: 'app-workflow-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-canvas.component.html',
  styleUrls: ['./workflow-canvas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowCanvasComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  private readonly query = inject(WorkflowQuery);
  private readonly adapter = inject(X6AdapterService);
  readonly nodes$ = this.query.nodes$;

  async ngAfterViewInit(): Promise<void> {
    await this.adapter.initialize(this.canvasHost.nativeElement);

    this.query.definition$
      .pipe(takeUntilDestroyed())
      .subscribe(({ nodes, edges }) => this.adapter.syncDefinition(nodes, edges));
  }

  ngOnDestroy(): void {
    this.adapter.destroy();
  }
}
