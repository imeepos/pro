// Flowbite Input Component
export { FlowbiteInputComponent } from './flowbite-input/flowbite-input.component';

// Flowbite Textarea Component
export { FlowbiteTextareaComponent } from './flowbite-textarea/flowbite-textarea.component';

// Flowbite Toggle Component
export { FlowbiteToggleComponent } from './flowbite-toggle/flowbite-toggle.component';

// Flowbite Color Component
export { FlowbiteColorComponent } from './flowbite-color/flowbite-color.component';

// Flowbite Slider Component
export { FlowbiteSliderComponent } from './flowbite-slider/flowbite-slider.component';

// Flowbite Select Component
export { FlowbiteSelectComponent, SelectOption, SelectGroup } from './flowbite-select/flowbite-select.component';

// Flowbite Checkbox Component
export { FlowbiteCheckboxComponent } from './flowbite-checkbox/flowbite-checkbox.component';

// Module exports for easy importing
import { FlowbiteInputComponent } from './flowbite-input/flowbite-input.component';
import { FlowbiteTextareaComponent } from './flowbite-textarea/flowbite-textarea.component';
import { FlowbiteToggleComponent } from './flowbite-toggle/flowbite-toggle.component';
import { FlowbiteColorComponent } from './flowbite-color/flowbite-color.component';
import { FlowbiteSliderComponent } from './flowbite-slider/flowbite-slider.component';
import { FlowbiteSelectComponent } from './flowbite-select/flowbite-select.component';
import { FlowbiteCheckboxComponent } from './flowbite-checkbox/flowbite-checkbox.component';

export const FLOWBITE_CONTROLS = [
  FlowbiteInputComponent,
  FlowbiteTextareaComponent,
  FlowbiteToggleComponent,
  FlowbiteColorComponent,
  FlowbiteSliderComponent,
  FlowbiteSelectComponent,
  FlowbiteCheckboxComponent
];

// Type exports
export type { SelectOption as FlowbiteSelectOption } from './flowbite-select/flowbite-select.component';
export type { SelectGroup as FlowbiteSelectGroup } from './flowbite-select/flowbite-select.component';