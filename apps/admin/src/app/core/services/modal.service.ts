import { Injectable, ComponentRef, Type, ViewContainerRef } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface ModalConfig<T = any> {
  data?: T;
}

export interface ModalRef<T = any, R = any> {
  close: (result?: R) => void;
  dismiss: () => void;
  afterClosed$: Observable<R | undefined>;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private container?: ViewContainerRef;
  private activeModal?: ComponentRef<any>;
  private readonly closeSubject = new Subject<any>();

  setContainer(container: ViewContainerRef): void {
    this.container = container;
  }

  open<T = any, R = any>(component: Type<any>, config?: ModalConfig<T>): ModalRef<T, R> {
    if (!this.container) {
      throw new Error('Modal container not initialized');
    }

    this.closeActive();

    const componentRef = this.container.createComponent(component);
    this.activeModal = componentRef;

    const modalRef: ModalRef<T, R> = {
      data: config?.data,
      close: (result?: R) => {
        this.closeSubject.next(result);
        this.destroy();
      },
      dismiss: () => {
        this.closeSubject.next(undefined);
        this.destroy();
      },
      afterClosed$: this.closeSubject.asObservable()
    };

    if (componentRef.instance.modalRef !== undefined) {
      componentRef.instance.modalRef = modalRef;
    }

    return modalRef;
  }

  private closeActive(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
  }

  private destroy(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
  }
}
