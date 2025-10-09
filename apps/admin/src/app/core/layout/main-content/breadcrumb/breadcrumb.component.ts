import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { filter, distinctUntilChanged } from 'rxjs/operators';

interface BreadcrumbItem {
  label: string;
  url: string;
  active: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  breadcrumbs: BreadcrumbItem[] = [];

  private routeLabels: Record<string, string> = {
    '': '首页',
    'screens': '大屏管理',
    'editor': '编辑大屏',
    'weibo': '微博管理',
    'accounts': '账号列表',
    'login': '微博登录'
  };

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });

    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
  }

  private buildBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: BreadcrumbItem[] = []
  ): BreadcrumbItem[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');

      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const pathSegments = url.split('/').filter(segment => segment);
      const currentPath = pathSegments[pathSegments.length - 1] || '';

      // 跳过空路径，避免与硬编码的"首页"重复
      if (currentPath !== '') {
        const label = this.getLabel(currentPath, child);

        if (label && !breadcrumbs.some(b => b.url === url)) {
          breadcrumbs.push({
            label,
            url,
            active: false
          });
        }
      }

      return this.buildBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  private getLabel(path: string, route: ActivatedRoute): string {
    if (route.snapshot.data['breadcrumb']) {
      return route.snapshot.data['breadcrumb'];
    }

    if (path.match(/^[0-9a-fA-F]{24}$/)) {
      return this.routeLabels['editor'] || '详情';
    }

    return this.routeLabels[path] || this.formatLabel(path);
  }

  private formatLabel(path: string): string {
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getCurrentUrl(): string {
    return this.router.url;
  }
}
