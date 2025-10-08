import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GridsterModule, GridsterConfig, GridsterItem } from 'angular-gridster2';
import { Subject, takeUntil } from 'rxjs';
import { ScreensService } from '../../../state/screens.service';
import { ScreensQuery } from '../../../state/screens.query';
import { ScreenPage, UpdateScreenDto } from '../../../core/services/screen-api.service';

interface ScreenGridsterItem extends GridsterItem {
  id?: string;
  type?: string;
}

@Component({
  selector: 'app-screen-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, GridsterModule],
  templateUrl: './screen-editor.component.html',
  styleUrls: ['./screen-editor.component.scss']
})
export class ScreenEditorComponent implements OnInit, OnDestroy {
  screenId: string = '';
  screen: ScreenPage | null = null;
  loading = false;
  saving = false;
  autoSaving = false;
  previewMode = false;

  pageName = '';
  canvasWidth = 1920;
  canvasHeight = 1080;
  canvasBackground = '#0f1419';
  gridEnabled = true;
  gridSize = 10;

  gridsterOptions: GridsterConfig = {};
  gridsterItems: Array<ScreenGridsterItem> = [];

  private destroy$ = new Subject<void>();
  private autoSaveTimer?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private screensService: ScreensService,
    private screensQuery: ScreensQuery
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id') || '';

    this.initGridsterOptions();
    this.loadScreen();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  private initGridsterOptions(): void {
    this.gridsterOptions = {
      gridType: 'fixed',
      displayGrid: 'always',
      pushItems: true,
      draggable: {
        enabled: !this.previewMode
      },
      resizable: {
        enabled: !this.previewMode
      },
      minCols: 24,
      maxCols: 24,
      minRows: 18,
      maxRows: 18,
      fixedColWidth: 80,
      fixedRowHeight: 60,
      margin: 10
    };
  }

  private loadScreen(): void {
    this.loading = true;
    this.screensQuery.selectEntity(this.screenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(screen => {
        if (screen) {
          this.screen = screen;
          this.pageName = screen.name;
          this.canvasWidth = screen.layout.width;
          this.canvasHeight = screen.layout.height;
          this.canvasBackground = screen.layout.background;
          this.gridEnabled = screen.layout.grid?.enabled ?? true;
          this.gridSize = screen.layout.grid?.size ?? 10;

          this.gridsterItems = screen.components.map(comp => ({
            x: comp.position.x,
            y: comp.position.y,
            cols: comp.position.width,
            rows: comp.position.height,
            id: comp.id,
            type: comp.type
          }));

          this.loading = false;
        }
      });

    this.screensService.loadScreens().subscribe();
  }

  private setupAutoSave(): void {
    this.autoSaveTimer = window.setInterval(() => {
      if (!this.saving && !this.previewMode) {
        this.autoSave();
      }
    }, 30000);
  }

  backToList(): void {
    this.router.navigate(['/screens']);
  }

  togglePreview(): void {
    this.previewMode = !this.previewMode;
    this.gridsterOptions.draggable!.enabled = !this.previewMode;
    this.gridsterOptions.resizable!.enabled = !this.previewMode;
    if (this.gridsterOptions.api) {
      this.gridsterOptions.api.optionsChanged!();
    }
  }

  save(): void {
    if (this.saving) return;

    this.saving = true;
    const dto: UpdateScreenDto = {
      name: this.pageName,
      layout: {
        width: this.canvasWidth,
        height: this.canvasHeight,
        background: this.canvasBackground,
        grid: {
          enabled: this.gridEnabled,
          size: this.gridSize
        }
      },
      components: this.gridsterItems.map(item => ({
        id: item.id || '',
        type: item.type || '',
        position: {
          x: item.x || 0,
          y: item.y || 0,
          width: item.cols || 1,
          height: item.rows || 1,
          zIndex: 1
        },
        config: {}
      }))
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        this.saving = false;
        alert('保存成功');
      },
      error: (error) => {
        this.saving = false;
        alert(`保存失败: ${error.message}`);
      }
    });
  }

  private autoSave(): void {
    if (!this.screen) return;

    this.autoSaving = true;
    const dto: UpdateScreenDto = {
      layout: {
        width: this.canvasWidth,
        height: this.canvasHeight,
        background: this.canvasBackground,
        grid: {
          enabled: this.gridEnabled,
          size: this.gridSize
        }
      },
      components: this.gridsterItems.map(item => ({
        id: item.id || '',
        type: item.type || '',
        position: {
          x: item.x || 0,
          y: item.y || 0,
          width: item.cols || 1,
          height: item.rows || 1,
          zIndex: 1
        },
        config: {}
      }))
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        this.autoSaving = false;
      },
      error: () => {
        this.autoSaving = false;
      }
    });
  }

  publish(): void {
    if (!confirm('确定要发布此页面吗？')) {
      return;
    }

    this.screensService.publishScreen(this.screenId).subscribe({
      next: () => {
        alert('发布成功');
      },
      error: (error) => {
        alert(`发布失败: ${error.message}`);
      }
    });
  }

  updatePageName(): void {
    if (!this.pageName.trim()) {
      alert('页面名称不能为空');
      return;
    }

    const dto: UpdateScreenDto = {
      name: this.pageName
    };

    this.screensService.updateScreen(this.screenId, dto).subscribe({
      next: () => {
        console.log('页面名称已更新');
      },
      error: (error) => {
        alert(`更新页面名称失败: ${error.message}`);
      }
    });
  }

  updateCanvasSize(): void {
    console.log('画布尺寸已更新');
  }

  updateBackground(): void {
    console.log('背景已更新');
  }

  updateGrid(): void {
    console.log('网格配置已更新');
  }
}
