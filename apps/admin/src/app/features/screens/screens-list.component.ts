import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ScreensService } from '../../state/screens.service';
import { ScreensQuery } from '../../state/screens.query';
import { ScreenPage, CreateScreenDto } from '../../core/services/screen-api.service';
import { ToastService } from '../../shared/services/toast.service';
import { CreateScreenDialogComponent } from './components/create-screen-dialog.component';
import { DeleteConfirmDialogComponent } from './components/delete-confirm-dialog.component';

@Component({
  selector: 'app-screens-list',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateScreenDialogComponent, DeleteConfirmDialogComponent],
  templateUrl: './screens-list.component.html'
})
export class ScreensListComponent implements OnInit, OnDestroy {
  screens: ScreenPage[] = [];
  loading = false;
  error: string | null = null;
  showCreateDialog = false;
  showDeleteDialog = false;
  screenToDelete: ScreenPage | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private router: Router,
    private toastService: ToastService
  ) {
    console.log('ScreensListComponent 构造函数 - 所有依赖注入成功');
    console.log('ScreensService:', !!screensService);
    console.log('ScreensQuery:', !!screensQuery);
    console.log('Router:', !!router);
    console.log('ToastService:', !!toastService);
  }

  ngOnInit(): void {
    console.log('ScreensListComponent ngOnInit 开始执行');
    this.screensQuery.screens$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(screens => {
      console.log('ScreensListComponent screens$ 订阅成功，屏幕数量:', screens.length);
      this.screens = screens;
    });

    this.screensQuery.loading$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(loading => {
      this.loading = loading;
    });

    this.screensQuery.error$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(error => {
      this.error = error;
    });

    this.loadScreens();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadScreens(): void {
    this.screensService.loadScreens().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      error: (error) => {
        console.error('加载页面列表失败:', error);
      }
    });
  }

  createScreen(): void {
    this.showCreateDialog = true;
  }

  closeCreateDialog(dto?: CreateScreenDto): void {
    this.showCreateDialog = false;

    if (!dto) return;

    this.screensService.createScreen(dto).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (screen) => {
        this.toastService.success('大屏页面创建成功');
        this.router.navigate(['/screens/editor', screen.id]);
      },
      error: (error) => {
        this.toastService.error(`创建失败: ${error.message}`);
      }
    });
  }

  editScreen(screen: ScreenPage): void {
    this.router.navigate(['/screens/editor', screen.id]);
  }

  openDeleteDialog(screen: ScreenPage): void {
    // 安全性检查
    if (!screen || !screen.id) {
      this.toastService.error('无效的页面信息');
      return;
    }

    // 防止删除默认页面时的额外警告
    if (screen.isDefault) {
      this.toastService.warning('警告：此页面是默认页面，删除后需要重新设置默认页面');
    }

    this.screenToDelete = screen;
    this.showDeleteDialog = true;
  }

  // 为兼容HTML模板中的调用，添加别名方法
  deleteScreen(screen: ScreenPage): void {
    this.openDeleteDialog(screen);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.screenToDelete = null;
  }

  onConfirmDelete(): void {
    if (!this.screenToDelete || !this.screenToDelete?.id) {
      this.toastService.error('删除失败：无效的页面信息');
      this.closeDeleteDialog();
      return;
    }

    const screenName = this.screenToDelete?.name || '未知页面';
    const isDefaultScreen = this.screenToDelete?.isDefault || false;

    this.screensService.deleteScreen(this.screenToDelete.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success(`页面 "${screenName}" 删除成功`);

        // 如果删除的是默认页面，提示用户设置新的默认页面
        if (isDefaultScreen) {
          setTimeout(() => {
            this.toastService.info('提示：请设置一个新的默认页面');
          }, 1000);
        }

        this.closeDeleteDialog();
      },
      error: (error) => {
        console.error('删除页面失败:', error);

        // 根据错误类型提供更具体的错误信息
        let errorMessage = '删除失败';
        if (error.status === 404) {
          errorMessage = '页面不存在或已被删除';
        } else if (error.status === 403) {
          errorMessage = '没有权限删除此页面';
        } else if (error.status === 409) {
          errorMessage = '页面正在被使用，无法删除';
        } else if (error.message) {
          errorMessage = `删除失败: ${error.message}`;
        }

        this.toastService.error(errorMessage);
        this.closeDeleteDialog();
      }
    });
  }

  copyScreen(screen: ScreenPage): void {
    this.screensService.copyScreen(screen.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('页面复制成功');
      },
      error: (error) => {
        this.toastService.error(`复制失败: ${error.message}`);
      }
    });
  }

  toggleStatus(screen: ScreenPage): void {
    if (screen.status === 'draft') {
      this.screensService.publishScreen(screen.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.toastService.success('页面发布成功');
        },
        error: (error) => {
          this.toastService.error(`发布失败: ${error.message}`);
        }
      });
    } else {
      this.screensService.draftScreen(screen.id).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.toastService.success('已设为草稿');
        },
        error: (error) => {
          this.toastService.error(`操作失败: ${error.message}`);
        }
      });
    }
  }

  setDefault(screen: ScreenPage): void {
    this.screensService.setDefaultScreen(screen.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('默认页面设置成功');
      },
      error: (error) => {
        this.toastService.error(`设置失败: ${error.message}`);
      }
    });
  }

  getStatusText(status: string): string {
    return status === 'draft' ? '草稿' : '已发布';
  }

  getStatusClass(status: string): string {
    return status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
