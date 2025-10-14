import { NgModule } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SafeDatePipe } from '../pipes/safe-date.pipe';

@NgModule({
  declarations: [
    SafeDatePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    SafeDatePipe
  ],
  providers: [
    {
      provide: DatePipe,
      useClass: SafeDatePipe
    }
  ]
})
export class SafeDateModule { }