import { Injectable, computed, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { ScreenPage } from '../types/screen.types';

export interface ScreenState {
  screens: ScreenPage[];
  activeScreenId: string | null;
  activeScreen: ScreenPage | null;
  manualSelectionId: string | null;
  loading: boolean;
  error: string | null;
  autoPlay: boolean;
}

const initialScreenState: ScreenState = {
  screens: [],
  activeScreenId: null,
  activeScreen: null,
  manualSelectionId: null,
  loading: false,
  error: null,
  autoPlay: false
};

@Injectable({ providedIn: 'root' })
export class ScreenSignalStore {
  private readonly state = signal<ScreenState>(initialScreenState);

  readonly screens = computed(() => this.state().screens);
  readonly activeScreen = computed(() => this.state().activeScreen);
  readonly activeScreenId = computed(() => this.state().activeScreenId);
  readonly manualSelectionId = computed(() => this.state().manualSelectionId);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly autoPlay = computed(() => this.state().autoPlay);
  readonly hasMultipleScreens = computed(() => this.state().screens.length > 1);

  readonly screens$ = toObservable(this.screens);
  readonly activeScreen$ = toObservable(this.activeScreen);
  readonly activeScreenId$ = toObservable(this.activeScreenId);
  readonly manualSelectionId$ = toObservable(this.manualSelectionId);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);
  readonly autoPlay$ = toObservable(this.autoPlay);
  readonly hasMultipleScreens$ = toObservable(this.hasMultipleScreens);

  reset(): void {
    this.state.set(initialScreenState);
  }

  setLoading(isLoading: boolean): void {
    this.state.update(current => ({
      ...current,
      loading: isLoading
    }));
  }

  setError(message: string | null): void {
    this.state.update(current => ({
      ...current,
      error: message
    }));
  }

  setAutoPlay(enabled: boolean): void {
    this.state.update(current => ({
      ...current,
      autoPlay: enabled
    }));
  }

  setManualSelection(id: string | null): void {
    this.state.update(current => ({
      ...current,
      manualSelectionId: id
    }));
  }

  setScreens(screens: ScreenPage[]): void {
    this.state.update(current => {
      const manualSelectionId = current.manualSelectionId;
      const resolvedManualSelection =
        manualSelectionId && screens.some(screen => screen.id === manualSelectionId)
          ? manualSelectionId
          : null;

      const preferredActiveId = resolvedManualSelection ?? current.activeScreenId;
      let activeScreen = preferredActiveId
        ? screens.find(screen => screen.id === preferredActiveId) ?? null
        : null;

      if (!activeScreen) {
        activeScreen = screens[0] ?? null;
      }

      return {
        ...current,
        screens,
        activeScreen,
        activeScreenId: activeScreen?.id ?? null,
        manualSelectionId: resolvedManualSelection
      };
    });
  }

  setActiveScreenById(id: string | null): void {
    this.state.update(current => {
      if (!id) {
        return {
          ...current,
          activeScreen: null,
          activeScreenId: null
        };
      }

      const matched = current.screens.find(screen => screen.id === id) ?? null;

      return {
        ...current,
        activeScreenId: id,
        activeScreen: matched ?? current.activeScreen
      };
    });
  }

  setActiveScreen(screen: ScreenPage | null): void {
    this.state.update(current => ({
      ...current,
      activeScreen: screen,
      activeScreenId: screen?.id ?? null
    }));
  }

  snapshot(): ScreenState {
    return this.state();
  }

  select<T>(project: (state: ScreenState) => T) {
    const selection = computed(() => project(this.state()));
    return toObservable(selection);
  }

  patch(partial: Partial<ScreenState>): void {
    this.state.update(current => ({
      ...current,
      ...partial
    }));
  }
}
