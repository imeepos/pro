import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

const SIDEBAR_STORAGE_KEY = 'sidebar_collapsed';

@Injectable({
  providedIn: 'root'
})
export class LayoutStateService {
  private readonly collapsedSubject = new BehaviorSubject<boolean>(
    this.loadSidebarState()
  );
  private readonly expandedMenusSubject = new BehaviorSubject<Set<string>>(
    new Set()
  );

  readonly collapsed$ = this.collapsedSubject.asObservable();
  readonly expandedMenus$ = this.expandedMenusSubject.asObservable();

  toggleSidebar(): void {
    const newState = !this.collapsedSubject.value;
    this.setSidebarCollapsed(newState);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.collapsedSubject.next(collapsed);
    this.saveSidebarState(collapsed);
  }

  toggleMenu(menuId: string): void {
    const expandedMenus = new Set(this.expandedMenusSubject.value);

    if (expandedMenus.has(menuId)) {
      expandedMenus.delete(menuId);
    } else {
      expandedMenus.add(menuId);
    }

    this.expandedMenusSubject.next(expandedMenus);
  }

  expandMenu(menuId: string): void {
    const expandedMenus = new Set(this.expandedMenusSubject.value);
    expandedMenus.add(menuId);
    this.expandedMenusSubject.next(expandedMenus);
  }

  collapseMenu(menuId: string): void {
    const expandedMenus = new Set(this.expandedMenusSubject.value);
    expandedMenus.delete(menuId);
    this.expandedMenusSubject.next(expandedMenus);
  }

  isMenuExpanded(menuId: string): Observable<boolean> {
    return new Observable(observer => {
      const subscription = this.expandedMenus$.subscribe(expandedMenus => {
        observer.next(expandedMenus.has(menuId));
      });
      return () => subscription.unsubscribe();
    });
  }

  private loadSidebarState(): boolean {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : false;
  }

  private saveSidebarState(collapsed: boolean): void {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(collapsed));
  }
}
