import { Component, OnInit, OnDestroy, ViewChild, ViewContainerRef, ComponentRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap } from 'rxjs/operators';
import { ScreenPage, Component as ScreenComponent, SkerSDK } from '@pro/sdk';
import { WebSocketManager, createScreensWebSocketConfig, JwtAuthService, ComponentRegistryService, IScreenComponent } from '@pro/components';
import { AuthStateService } from '../../core/state/auth-state.service';
import { AuthQuery } from '../../core/state/auth.query';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('componentsContainer', { read: ViewContainerRef }) componentsContainer!: ViewContainerRef;

  screenConfig: ScreenPage | null = null;
  loading = true;
  error: string | null = null;
  isFullscreen = false;
  currentUser$ = this.authQuery.currentUser$;

  // 轮播和切换功能
  availableScreens: ScreenPage[] = [];
  currentScreenIndex = 0;
  isAutoPlay = false;
  autoPlayInterval = 30000; // 30秒切换一次

  private destroy$ = new Subject<void>();
  private componentRefs: ComponentRef<any>[] = [];
  private autoPlaySubscription: any;

  constructor(
    private authStateService: AuthStateService,
    private authQuery: AuthQuery,
    private router: Router,
    private sdk: SkerSDK,
    private wsManager: WebSocketManager,
    private authService: JwtAuthService,
    private componentRegistry: ComponentRegistryService,
    private cdr: ChangeDetectorRef,
    private tokenStorage: TokenStorageService
  ) {}

  ngOnInit(): void {
    this.loadAvailableScreens().then(() => {
      this.loadDefaultScreen();
    });

    this.initializeWebSocketConnection();
    this.listenToFullscreenChanges();
    this.setupRealtimeSync();
  }

  ngOnDestroy(): void {
    this.clearComponents();
    this.stopAutoPlay();
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authStateService.logout().subscribe();
  }

  private loadDefaultScreen(): void {
    this.loading = true;
    this.error = null;

    this.sdk.screen.getDefaultScreen$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (config) => {
          this.screenConfig = config;
          this.loading = false;
          this.cdr.markForCheck();
          this.renderComponents();
        },
        error: (err) => {
          this.error = err.error?.message || '加载默认大屏配置失败';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  private listenToFullscreenChanges(): void {
    document.addEventListener('fullscreenchange', () => {
      this.isFullscreen = !!document.fullscreenElement;
    });
  }

  private renderComponents(): void {
    if (!this.screenConfig?.components || !this.componentsContainer) {
      return;
    }

    this.clearComponents();

    this.screenConfig.components.forEach((componentConfig: ScreenComponent) => {
      this.createComponent(componentConfig);
    });

    this.cdr.markForCheck();
  }

  private createComponent(componentConfig: ScreenComponent): void {
    const componentType = this.componentRegistry.get(componentConfig.type);

    if (!componentType) {
      console.error(`组件类型未注册: ${componentConfig.type}`);
      return;
    }

    const componentRef = this.componentsContainer.createComponent(componentType);

    const wrapper = componentRef.location.nativeElement;
    wrapper.classList.add('component-wrapper');
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${componentConfig.position.x}px`;
    wrapper.style.top = `${componentConfig.position.y}px`;
    wrapper.style.width = `${componentConfig.position.width}px`;
    wrapper.style.height = `${componentConfig.position.height}px`;
    wrapper.style.zIndex = `${componentConfig.position.zIndex}`;

    const instance = componentRef.instance as IScreenComponent;
    if (instance.onConfigChange && componentConfig.config) {
      instance.onConfigChange(componentConfig.config);
    }

    this.componentRefs.push(componentRef);
  }

  private clearComponents(): void {
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs = [];

    if (this.componentsContainer) {
      this.componentsContainer.clear();
    }
  }

  private initializeWebSocketConnection(): void {
    const existingConnection = this.wsManager.getConnection(environment.wsNamespace);
    if (existingConnection) {
      return;
    }

    const token = this.tokenStorage.getToken();
    const wsConfig = createScreensWebSocketConfig(environment.wsUrl, token ?? undefined);
    this.wsManager.connectToNamespace(wsConfig);
  }

  private async loadAvailableScreens(): Promise<void> {
    try {
      const response = await this.sdk.screen.getPublishedScreens$().pipe(takeUntil(this.destroy$)).toPromise();
      if (response) {
        this.availableScreens = response.items;
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Failed to load available screens:', error);
    }
  }

  // 切换和轮播功能
  switchToScreen(event: any): void {
    const index = parseInt(event.target.value);
    if (index >= 0 && index < this.availableScreens.length) {
      this.currentScreenIndex = index;
      const screen = this.availableScreens[index];
      this.loadScreenConfig(screen);
    }
  }

  nextScreen(): void {
    if (this.availableScreens.length > 1) {
      this.currentScreenIndex = (this.currentScreenIndex + 1) % this.availableScreens.length;
      const screen = this.availableScreens[this.currentScreenIndex];
      this.loadScreenConfig(screen);
    }
  }

  previousScreen(): void {
    if (this.availableScreens.length > 1) {
      this.currentScreenIndex = this.currentScreenIndex === 0
        ? this.availableScreens.length - 1
        : this.currentScreenIndex - 1;
      const screen = this.availableScreens[this.currentScreenIndex];
      this.loadScreenConfig(screen);
    }
  }

  toggleAutoPlay(): void {
    if (this.isAutoPlay) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (this.availableScreens.length <= 1) return;

    this.isAutoPlay = true;
    this.autoPlaySubscription = interval(this.autoPlayInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.nextScreen();
      });
  }

  private stopAutoPlay(): void {
    this.isAutoPlay = false;
    if (this.autoPlaySubscription) {
      this.autoPlaySubscription.unsubscribe();
      this.autoPlaySubscription = null;
    }
  }

  private loadScreenConfig(screen: ScreenPage): void {
    this.screenConfig = screen;
    this.loading = false;
    this.error = null;
    this.cdr.markForCheck();
    this.renderComponents();

    const screenIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (screenIndex !== -1) {
      this.currentScreenIndex = screenIndex;
    }
  }

  // 实时同步功能
  private setupRealtimeSync(): void {
    this.listenToScreenPublishEvents();
    this.listenToScreenUpdateEvents();
    this.listenToScreenDeleteEvents();
  }

  private listenToScreenPublishEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:published')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.handleNewScreenPublished(data.screen);
        });
    }
  }

  private listenToScreenUpdateEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:updated')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.handleScreenUpdated(data.screen);
        });
    }
  }

  private listenToScreenDeleteEvents(): void {
    const wsInstance = this.wsManager.getConnection(environment.wsNamespace);
    if (wsInstance) {
      wsInstance.on('screen:unpublished')
        .pipe(takeUntil(this.destroy$))
        .subscribe((data: any) => {
          this.handleScreenUnpublished(data.screenId);
        });
    }
  }

  private handleNewScreenPublished(screen: ScreenPage): void {
    const existingIndex = this.availableScreens.findIndex(s => s.id === screen.id);
    if (existingIndex === -1) {
      this.availableScreens.push(screen);
      this.cdr.markForCheck();
    }
  }

  private handleScreenUpdated(updatedScreen: ScreenPage): void {
    const index = this.availableScreens.findIndex(s => s.id === updatedScreen.id);
    if (index !== -1) {
      this.availableScreens[index] = updatedScreen;

      if (this.screenConfig?.id === updatedScreen.id) {
        this.loadScreenConfig(updatedScreen);
      }

      this.cdr.markForCheck();
    }
  }

  private handleScreenUnpublished(screenId: string): void {
    const index = this.availableScreens.findIndex(s => s.id === screenId);
    if (index !== -1) {
      this.availableScreens.splice(index, 1);

      if (this.screenConfig?.id === screenId) {
        if (this.availableScreens.length > 0) {
          this.currentScreenIndex = 0;
          this.loadScreenConfig(this.availableScreens[0]);
        } else {
          this.screenConfig = null;
          this.clearComponents();
        }
      }

      this.cdr.markForCheck();
    }
  }
}
