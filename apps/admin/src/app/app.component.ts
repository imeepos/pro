import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { FlowbiteService } from './shared/services/flowbite.service';
import { ComponentInitializerService } from '@pro/components';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private flowbiteService = inject(FlowbiteService);
  private componentInitializer = inject(ComponentInitializerService);
  title = 'admin';

  ngOnInit(): void {
    this.flowbiteService.initialize();
    this.componentInitializer.initializeComponents();

    // 验证组件注册状态
    const validation = this.componentInitializer.validateRegistration();
    console.log('组件注册验证结果:', validation);
  }
}
