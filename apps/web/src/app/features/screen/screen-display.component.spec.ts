import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideAngularQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { of } from 'rxjs';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { ScreenDisplayComponent } from './screen-display.component';
import { ScreenSignalStore } from '../../core/state/screen.signal-store';
import { ScreenService } from '../../core/services/screen.service';
import { ScreenPage } from '../../core/types/screen.types';
import { WebSocketManager, WebSocketConfig } from '@pro/components';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { JwtAuthService } from '@pro/components';
import { ComponentRegistryService } from '@pro/components';

type WebSocketHandler = {
  pipe: () => { subscribe: (callback: (value: unknown) => void) => void };
  subscribe: (callback: (value: unknown) => void) => void;
};

class ScreenServiceStub {
  screens: ScreenPage[] = [];

  fetchPublishedScreens(): Promise<{ items: ScreenPage[] }> {
    return Promise.resolve({ items: this.screens });
  }

  fetchDefaultScreen(): Promise<ScreenPage | null> {
    return Promise.resolve(this.screens[0] ?? null);
  }

  fetchScreen(id: string): Promise<ScreenPage | null> {
    return Promise.resolve(this.screens.find(screen => screen.id === id) ?? null);
  }
}

class WebSocketManagerStub {
  getConnection(): null {
    return null;
  }

  connectToNamespace(_config: WebSocketConfig): { on: () => WebSocketHandler } {
    return {
      on: () => ({
        pipe: () => ({ subscribe: () => void 0 }),
        subscribe: () => void 0
      })
    };
  }
}

class TokenStorageServiceStub {
  getToken(): string | null {
    return null;
  }
}

class JwtAuthServiceStub {}

class ComponentRegistryServiceStub {
  get(): unknown {
    return null;
  }
}

describe('ScreenDisplayComponent', () => {
  let fixture: ComponentFixture<ScreenDisplayComponent>;
  let component: ScreenDisplayComponent;
  let store: ScreenSignalStore;
  let screenService: ScreenServiceStub;
  const screens: ScreenPage[] = [
    {
      id: 'screen-a',
      name: 'Screen A',
      layout: { width: 1920, height: 1080 },
      components: [],
      status: 'published',
      createdBy: 'tester',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'screen-b',
      name: 'Screen B',
      layout: { width: 1920, height: 1080 },
      components: [],
      status: 'published',
      createdBy: 'tester',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenDisplayComponent],
      providers: [
        provideAngularQuery(
          new QueryClient({
            defaultOptions: {
              queries: {
                retry: false,
                staleTime: 0,
                gcTime: 0
              }
            }
          })
        ),
        { provide: ScreenService, useClass: ScreenServiceStub },
        { provide: WebSocketManager, useClass: WebSocketManagerStub },
        { provide: TokenStorageService, useClass: TokenStorageServiceStub },
        { provide: JwtAuthService, useClass: JwtAuthServiceStub },
        { provide: ComponentRegistryService, useClass: ComponentRegistryServiceStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({}) },
            paramMap: of(convertToParamMap({}))
          }
        }
      ]
    }).compileComponents();

    store = TestBed.inject(ScreenSignalStore);
    store.reset();
    store.setScreens(screens);
    screenService = TestBed.inject(ScreenService) as unknown as ScreenServiceStub;
    screenService.screens = screens;

    fixture = TestBed.createComponent(ScreenDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('avoids redundant manual selection writes', () => {
    (component as unknown as { manualSelectionId: string | null }).manualSelectionId = 'screen-b';

    const setSpy = spyOn(store, 'setManualSelection').and.callThrough();
    (component as unknown as { updateManualSelection: (id: string | null) => void }).updateManualSelection('screen-b');
    expect(setSpy).not.toHaveBeenCalled();

    (component as unknown as { updateManualSelection: (id: string | null) => void }).updateManualSelection('screen-a');
    expect(setSpy).toHaveBeenCalledWith('screen-a');
    expect((component as unknown as { manualSelectionId: string | null }).manualSelectionId).toBe('screen-a');
  });

  it('reacts to store manual selection updates', fakeAsync(() => {
    store.setScreens(screens);
    tick();
    fixture.detectChanges();
    tick();

    store.setManualSelection('screen-b');
    tick();
    fixture.detectChanges();
    tick();

    expect(store.manualSelectionId()).toBe('screen-b');
    expect((component as unknown as { manualSelectionId: string | null }).manualSelectionId).toBe('screen-b');
    expect(component.currentScreenIndex).toBe(1);
  }));
});
