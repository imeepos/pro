import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-flowbite-demo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './flowbite-demo.component.html',
  styleUrls: ['./flowbite-demo.component.scss']
})
export class FlowbiteDemoComponent {
  showAlert = true;

  closeAlert(): void {
    this.showAlert = false;
  }
}
