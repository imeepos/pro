import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreadcrumbComponent } from './breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-main-content',
  standalone: true,
  imports: [RouterOutlet, BreadcrumbComponent],
  templateUrl: './main-content.component.html',
  host: { class: 'flex flex-1 overflow-hidden' }
})
export class MainContentComponent {}
