import { Component, OnInit, OnDestroy, ViewContainerRef, ViewChild, ComponentRef, createComponent, EnvironmentInjector, QueryList, ViewChildren, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { GridsterModule, GridsterConfig, GridsterItem } from 'angular-gridster2';
import { Subject, takeUntil } from 'rxjs';
import { ScreensService } from '../../../state/screens.service';
import { ScreensQuery } from '../../../state/screens.query';
import { ScreenPage, UpdateScreenDto } from '../../../core/services/screen-api.service';
import { ComponentRegistryService } from '../../../core/services/component-registry.service';
import { ComponentHostDirective } from './component-host.directive';

interface ScreenGridsterItem extends GridsterItem {
  id?: string;
  type?: string;
  componentRef?: ComponentRef<any>;
}

@Component({
  selector: 'app-screen-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, GridsterModule, DragDropModule, ComponentHostDirective],
  templateUrl: './screen-editor.component.html',
  styleUrls: ['./screen-editor.component.scss']
})
export class ScreenEditorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChildren(ComponentHostDirective) componentHosts!: QueryList<ComponentHostDirective>;
  screenId: string = '';
  screen: ScreenPage | null = null;
  loading = false;
  saving = false;
  autoSaving = false;
  previewMode = false;

  pageName = '';
  canvasCols = 24;
  canvasRows = 24;

  gridsterOptions: GridsterConfig = {};
  gridsterItems: Array<ScreenGridsterItem> = [];

  availableComponents: Array<{ type: string; name: string; icon: string; category: string }> = [];

  private destroy$ = new Subject<void>();
  private autoSaveTimer?: number;
  private componentCounter = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private componentRegistry: ComponentRegistryService,
    private environmentInjector: EnvironmentInjector
  ) {}

  ngOnInit(): void {
    this.screenId = this.route.snapshot.paramMap.get('id') || '';

    this.loadAvailableComponents();
    this.initGridsterOptions();
    this.loadScreen();
    this.setupAutoSave();
  }

  ngAfterViewInit(): void {
    this.componentHosts.changes.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.renderAllComponents();
    });
  }

  ngOnDestroy(): void {
    this.gridsterItems.forEach(item => {
      if (item.componentRef) {
        item.componentRef.destroy();
      }
    });
    this.destroy$.next();
    this.destroy$.complete();
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
  }

  private loadAvailableComponents(): void {
    this.availableComponents = this.componentRegistry.getAll().map(item => ({
      type: item.metadata.type,
      name: item.metadata.name,
      icon: item.metadata.icon,
      category: item.metadata.category
    }));
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
      minCols: this.canvasCols,
      maxCols: this.canvasCols,
      minRows: this.canvasRows,
      maxRows: this.canvasRows,
      fixedColWidth: 80,
      fixedRowHeight: 60,
      margin: 10,
      itemChangeCallback: (item: GridsterItem) => {
        this.onGridsterItemChange(item);
      }
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
          this.canvasCols = screen.layout.cols;
          this.canvasRows = screen.layout.rows;

          this.gridsterItems = screen.components.map(comp => ({
            x: comp.position.x,
            y: comp.position.y,
            cols: comp.position.width,
            rows: comp.position.height,
            id: comp.id,
            type: comp.type
          }));

          this.loading = false;

          setTimeout(() => {
            this.renderAllComponents();
          }, 100);
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
        cols: this.canvasCols,
        rows: this.canvasRows
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
        cols: this.canvasCols,
        rows: this.canvasRows
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
      error: (error) => {
        alert(`更新页面名称失败: ${error.message}`);
      }
    });
  }

  updateCanvasGrid(): void {
    if (this.gridsterOptions.api) {
      this.gridsterOptions.minCols = this.canvasCols;
      this.gridsterOptions.maxCols = this.canvasCols;
      this.gridsterOptions.minRows = this.canvasRows;
      this.gridsterOptions.maxRows = this.canvasRows;
      this.gridsterOptions.api.optionsChanged!();
    }
  }

  onComponentDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const componentType = event.item.data;
    this.addComponentToCanvas(componentType);
  }

  private addComponentToCanvas(componentType: string): void {
    this.componentCounter++;
    const newItem: ScreenGridsterItem = {
      x: 0,
      y: 0,
      cols: 4,
      rows: 3,
      id: `comp-${Date.now()}-${this.componentCounter}`,
      type: componentType
    };

    this.gridsterItems.push(newItem);
  }

  private renderAllComponents(): void {
    const hostsArray = this.componentHosts.toArray();

    this.gridsterItems.forEach((item, index) => {
      if (index < hostsArray.length && !item.componentRef) {
        const host = hostsArray[index];
        this.renderComponentInHost(item, host.viewContainerRef);
      }
    });
  }

  private renderComponentInHost(item: ScreenGridsterItem, viewContainerRef: ViewContainerRef): void {
    if (!item.type) return;

    const componentClass = this.componentRegistry.get(item.type);
    if (!componentClass) {
      console.error(`组件类型未找到: ${item.type}`);
      return;
    }

    viewContainerRef.clear();
    const componentRef = viewContainerRef.createComponent(componentClass);
    item.componentRef = componentRef;
  }

  removeComponent(item: ScreenGridsterItem): void {
    if (item.componentRef) {
      item.componentRef.destroy();
    }

    const index = this.gridsterItems.indexOf(item);
    if (index > -1) {
      this.gridsterItems.splice(index, 1);
    }
  }

  private onGridsterItemChange(item: GridsterItem): void {
    // Gridster item changed
  }
}
