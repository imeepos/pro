import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScreenHeaderComponent } from './screen-header.component';
import { ScreenPage } from '../../../../core/types/screen.types';

const createScreen = (overrides: Partial<ScreenPage> = {}): ScreenPage => ({
  id: 'screen-id',
  name: '视觉看板',
  description: '主数据大屏',
  layout: {
    width: 1920,
    height: 1080,
    background: '#000000'
  },
  components: [],
  status: 'published',
  isDefault: false,
  createdBy: 'tester',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides
});

describe('ScreenHeaderComponent', () => {
  let fixture: ComponentFixture<ScreenHeaderComponent>;
  let component: ScreenHeaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenHeaderComponent);
    component = fixture.componentInstance;
  });

  it('should render active screen metadata', () => {
    const screen = createScreen({ name: '销售总览', description: '核心经营指标' });
    component.screen = screen;
    component.availableScreens = [screen];

    fixture.detectChanges();

    const headerElement: HTMLElement = fixture.nativeElement;
    expect(headerElement.querySelector('.screen-title')?.textContent).toContain('销售总览');
    expect(headerElement.querySelector('.screen-subtitle')?.textContent).toContain('核心经营指标');
  });

  it('should emit controls when interactions occur', () => {
    const screens = [createScreen({ id: 'a', name: 'A' }), createScreen({ id: 'b', name: 'B' })];
    component.screen = screens[0];
    component.availableScreens = screens;
    component.hasMultipleScreens = true;

    const autoPlaySpy = jasmine.createSpy('autoPlay');
    const previousSpy = jasmine.createSpy('previous');
    const nextSpy = jasmine.createSpy('next');
    const screenSelectSpy = jasmine.createSpy('screenSelect');
    const fullscreenSpy = jasmine.createSpy('fullscreen');

    component.autoPlayToggle.subscribe(autoPlaySpy);
    component.previous.subscribe(previousSpy);
    component.next.subscribe(nextSpy);
    component.screenSelect.subscribe(screenSelectSpy);
    component.fullscreenToggle.subscribe(fullscreenSpy);

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement;
    host.querySelector<HTMLButtonElement>('button[title="开始轮播"]')?.click();
    host.querySelector<HTMLButtonElement>('button[title="上一页"]')?.click();
    host.querySelector<HTMLButtonElement>('button[title="下一页"]')?.click();

    const selector = host.querySelector<HTMLSelectElement>('.toolbar-selector');
    if (selector) {
      selector.value = '1';
      selector.dispatchEvent(new Event('change'));
    }

    host.querySelector<HTMLButtonElement>('.screen-action')?.click();

    expect(autoPlaySpy).toHaveBeenCalled();
    expect(previousSpy).toHaveBeenCalled();
    expect(nextSpy).toHaveBeenCalled();
    expect(screenSelectSpy).toHaveBeenCalledWith(1);
    expect(fullscreenSpy).toHaveBeenCalled();
  });

  it('should collapse header when fullscreen is active', () => {
    component.screen = createScreen();
    component.availableScreens = [component.screen];
    component.isFullscreen = true;

    fixture.detectChanges();

    const headerElement: HTMLElement = fixture.nativeElement.querySelector('.screen-header');
    expect(headerElement?.classList.contains('screen-header--compact')).toBeTrue();
  });
});
