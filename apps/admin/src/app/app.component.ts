import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/components/toast/toast-container.component';
import { FlowbiteService } from './shared/services/flowbite.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private flowbiteService = inject(FlowbiteService);
  title = 'admin';

  ngOnInit(): void {
    this.flowbiteService.initialize();
  }
}
