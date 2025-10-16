import { HomeComponent } from './home.component';
import { ScreenSignalStore } from '../../core/state/screen.signal-store';

describe('HomeComponent.updateManualSelection', () => {
  it('avoids redundant writes and updates cache when id changes', () => {
    const store = jasmine.createSpyObj<ScreenSignalStore>('ScreenSignalStore', ['setManualSelection']);
    const instance = { screenStore: store } as unknown as HomeComponent;
    const bridge = HomeComponent.prototype['updateManualSelection'] as (this: HomeComponent, id: string | null) => void;

    Reflect.set(instance as unknown as Record<string, unknown>, 'manualSelectionId', 'screen-a');

    bridge.call(instance, 'screen-a');
    expect(store.setManualSelection).not.toHaveBeenCalled();

    bridge.call(instance, 'screen-b');
    expect(store.setManualSelection).toHaveBeenCalledWith('screen-b');
    expect(Reflect.get(instance as unknown as Record<string, unknown>, 'manualSelectionId')).toBe('screen-b');
  });
});
