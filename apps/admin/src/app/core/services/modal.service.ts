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
  private activeCloseSubject?: Subject<any>;

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

    const closeSubject = new Subject<R | undefined>();
    this.activeCloseSubject = closeSubject;

    const modalRef: ModalRef<T, R> = {
      data: config?.data,
      close: (result?: R) => {
        closeSubject.next(result);
        closeSubject.complete();
        this.destroy();
      },
      dismiss: () => {
        closeSubject.next(undefined);
        closeSubject.complete();
        this.destroy();
      },
      afterClosed$: closeSubject.asObservable()
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
    if (this.activeCloseSubject) {
      this.activeCloseSubject.complete();
      this.activeCloseSubject = undefined;
    }
  }

  private destroy(): void {
    if (this.activeModal) {
      this.activeModal.destroy();
      this.activeModal = undefined;
    }
    if (this.activeCloseSubject) {
      this.activeCloseSubject.complete();
      this.activeCloseSubject = undefined;
    }
  }
}
