import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[appComponentHost]',
  standalone: true
})
export class ComponentHostDirective {
  constructor(public viewContainerRef: ViewContainerRef) {}
}
