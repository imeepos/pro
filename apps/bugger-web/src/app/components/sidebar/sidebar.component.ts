import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLinkActive],
  template: `
    <aside class="w-64 bg-white shadow-sm h-screen sticky top-0">
      <nav class="p-4 space-y-2">
        <a
          routerLink="/dashboard"
          routerLinkActive="bg-blue-50 text-blue-600"
          class="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          <span>仪表板</span>
        </a>

        <a
          routerLink="/bugs"
          routerLinkActive="bg-blue-50 text-blue-600"
          class="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <span>Bug列表</span>
        </a>

        <a
          routerLink="/bugs/new"
          routerLinkActive="bg-blue-50 text-blue-600"
          class="flex items-center space-x-3 px-3 py-2 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          <span>提交Bug</span>
        </a>

        <div class="border-t border-gray-200 pt-4 mt-4">
          <h3 class="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            筛选器
          </h3>

          <div class="space-y-3">
            <div class="px-3">
              <label class="text-xs font-medium text-gray-700">状态</label>
              <select class="mt-1 w-full text-sm border border-gray-300 rounded-md px-2 py-1">
                <option>全部状态</option>
                <option>待处理</option>
                <option>进行中</option>
                <option>已解决</option>
                <option>已关闭</option>
              </select>
            </div>

            <div class="px-3">
              <label class="text-xs font-medium text-gray-700">优先级</label>
              <select class="mt-1 w-full text-sm border border-gray-300 rounded-md px-2 py-1">
                <option>全部优先级</option>
                <option>低</option>
                <option>中</option>
                <option>高</option>
                <option>紧急</option>
              </select>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  `,
  styles: []
})
export class SidebarComponent {
  constructor(private router: Router) {}
}