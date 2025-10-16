import { firstValueFrom } from 'rxjs';
import { ScreenSignalStore, ScreenState } from './screen.signal-store';
import { ScreenPage } from '../types/screen.types';

const createScreen = (overrides: Partial<ScreenPage> = {}): ScreenPage => ({
  id: 'screen-id',
  name: '默认大屏',
  description: '描述',
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

describe('ScreenSignalStore', () => {
  let store: ScreenSignalStore;

  beforeEach(() => {
    store = new ScreenSignalStore();
  });

  it('should provide initial state snapshot', () => {
    const snapshot = store.snapshot();

    expect(snapshot).toEqual({
      screens: [],
      activeScreenId: null,
      activeScreen: null,
      manualSelectionId: null,
      loading: false,
      error: null,
      autoPlay: false
    } as ScreenState);
  });

  it('should set screens and mark the first screen active by default', () => {
    const primary = createScreen({ id: 'primary', name: 'Primary' });
    const secondary = createScreen({ id: 'secondary', name: 'Secondary' });

    store.setScreens([primary, secondary]);

    expect(store.screens()).toEqual([primary, secondary]);
    expect(store.activeScreen()).toBe(primary);
    expect(store.activeScreenId()).toBe('primary');
    expect(store.hasMultipleScreens()).toBeTrue();
  });

  it('should honour active screen selection by id', () => {
    const primary = createScreen({ id: 'primary' });
    const secondary = createScreen({ id: 'secondary' });
    store.setScreens([primary, secondary]);

    store.setActiveScreenById('secondary');

    expect(store.activeScreen()).toBe(secondary);
    expect(store.activeScreenId()).toBe('secondary');
  });

  it('should allow manual selection tracking', async () => {
    store.setManualSelection('manual-screen');

    expect(store.manualSelectionId()).toBe('manual-screen');
    const manualSelectionFromStream = await firstValueFrom(store.manualSelectionId$);
    expect(manualSelectionFromStream).toBe('manual-screen');
  });

  it('should toggle loading, error, and autoplay flags gracefully', () => {
    store.setLoading(true);
    store.setError('加载失败');
    store.setAutoPlay(true);

    expect(store.loading()).toBeTrue();
    expect(store.error()).toBe('加载失败');
    expect(store.autoPlay()).toBeTrue();
  });

  it('should expose selections through select()', async () => {
    const screen = createScreen();
    store.setScreens([screen]);

    const activeName$ = store.select(state => state.activeScreen?.name ?? null);
    const activeName = await firstValueFrom(activeName$);

    expect(activeName).toBe(screen.name);
  });
});
