import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ScreensService } from '../../state/screens.service';
import { ScreensQuery } from '../../state/screens.query';
import { ScreenPage, CreateScreenDto } from '../../core/services/screen-api.service';

@Component({
  selector: 'app-screens-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './screens-list.component.html',
  styleUrls: ['./screens-list.component.scss']
})
export class ScreensListComponent implements OnInit, OnDestroy {
  screens: ScreenPage[] = [];
  loading = false;
  error: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private screensService: ScreensService,
    private screensQuery: ScreensQuery,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.screensQuery.screens$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(screens => {
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
    this.screensService.loadScreens().subscribe({
      error: (error) => {
        console.error('加载页面列表失败:', error);
      }
    });
  }

  createScreen(): void {
    const name = prompt('请输入页面名称:');
    if (!name) return;

    const dto: CreateScreenDto = {
      name,
      layout: {
        width: 1920,
        height: 1080,
        background: '#0f1419',
        grid: { enabled: true, size: 10 }
      },
      components: []
    };

    this.screensService.createScreen(dto).subscribe({
      next: (screen) => {
        alert('创建成功');
        this.router.navigate(['/screens/editor', screen.id]);
      },
      error: (error) => {
        alert(`创建失败: ${error.message}`);
      }
    });
  }

  editScreen(screen: ScreenPage): void {
    this.router.navigate(['/screens']);
  }

  deleteScreen(screen: ScreenPage): void {
    if (!confirm(`确定要删除页面 "${screen.name}" 吗？`)) {
      return;
    }

    this.screensService.deleteScreen(screen.id).subscribe({
      next: () => {
        alert('删除成功');
      },
      error: (error) => {
        alert(`删除失败: ${error.message}`);
      }
    });
  }

  copyScreen(screen: ScreenPage): void {
    this.screensService.copyScreen(screen.id).subscribe({
      next: () => {
        alert('复制成功');
      },
      error: (error) => {
        alert(`复制失败: ${error.message}`);
      }
    });
  }

  toggleStatus(screen: ScreenPage): void {
    if (screen.status === 'draft') {
      this.screensService.publishScreen(screen.id).subscribe({
        next: () => {
          alert('发布成功');
        },
        error: (error) => {
          alert(`发布失败: ${error.message}`);
        }
      });
    } else {
      this.screensService.draftScreen(screen.id).subscribe({
        next: () => {
          alert('设为草稿成功');
        },
        error: (error) => {
          alert(`设为草稿失败: ${error.message}`);
        }
      });
    }
  }

  setDefault(screen: ScreenPage): void {
    this.screensService.setDefaultScreen(screen.id).subscribe({
      next: () => {
        alert('设置默认页面成功');
      },
      error: (error) => {
        alert(`设置默认页面失败: ${error.message}`);
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
