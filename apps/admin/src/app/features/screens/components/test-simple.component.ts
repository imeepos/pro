import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-test-simple',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-4 bg-green-100 border border-green-300 rounded">
      <h3 class="text-lg font-bold text-green-800">测试组件</h3>
      <p class="text-green-600">这个组件没有额外的依赖，用于测试依赖注入</p>
      <p class="text-sm text-gray-600">创建时间: {{timestamp}}</p>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class TestSimpleComponent {
  timestamp = new Date().toLocaleString();
}