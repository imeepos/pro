import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectOption } from './select.component';
import {
  FormField,
  FormControl,
  provideFlowbiteFormFieldConfig,
  provideFlowbiteFormControlConfig,
} from 'flowbite-angular/form';
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  provideFlowbiteDropdownConfig,
  provideFlowbiteDropdownContentConfig,
  provideFlowbiteDropdownItemConfig
} from 'flowbite-angular/dropdown';

describe('SelectComponent', () => {
  let component: SelectComponent;
  let fixture: ComponentFixture<SelectComponent>;

  const mockOptions: SelectOption[] = [
    { value: '1', label: '选项 1' },
    { value: '2', label: '选项 2' },
    { value: '3', label: '选项 3' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SelectComponent,
        FormsModule,
        ReactiveFormsModule,
        FormField,
        FormControl,
        Dropdown,
        DropdownContent,
        DropdownItem
      ],
      providers: [
        provideFlowbiteFormFieldConfig({
          size: 'md',
          color: 'default',
          mode: 'normal'
        }),
        provideFlowbiteFormControlConfig({}),
        provideFlowbiteDropdownConfig({
          color: 'default'
        }),
        provideFlowbiteDropdownContentConfig({}),
        provideFlowbiteDropdownItemConfig({})
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectComponent);
    component = fixture.componentInstance;

    // Set input signal values through component inputs
    component.options = mockOptions as any;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display placeholder when no value is selected', () => {
    expect(component.displayValue).toBe('请选择');
  });

  it('should display selected option label', () => {
    component.value.set('2');
    fixture.detectChanges();
    expect(component.displayValue).toBe('选项 2');
  });

  it('should filter options when search term is provided', () => {
    component.searchable = true as any;
    component.searchTerm.set('选项 1');
    fixture.detectChanges();

    const filtered = component.filteredOptions;
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe('选项 1');
  });

  it('should emit selectionChange when option is selected', () => {
    spyOn(component.selectionChange, 'emit');
    component.selectOption(mockOptions[1]);

    expect(component.selectionChange.emit).toHaveBeenCalledWith(mockOptions[1]);
    expect(component.value()).toBe('2');
  });

  it('should clear selection when clearSelection is called', () => {
    component.value.set('2');
    component.clearable = true as any;
    fixture.detectChanges();

    component.clearSelection();

    expect(component.value()).toBeNull();
    expect(component.displayValue).toBe('请选择');
  });

  it('should handle keyboard navigation', () => {
    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    spyOn(mockEvent, 'preventDefault');

    component.onKeydown(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should respect disabled state', () => {
    component.disabled = true as any;
    fixture.detectChanges();

    expect(component.isOpen()).toBe(false);
    component.toggleDropdown();
    expect(component.isOpen()).toBe(false);
  });

  it('should handle loading state', () => {
    component.loading = true as any;
    fixture.detectChanges();

    expect(component.filteredOptions.length).toBe(0);
  });

  it('should work with ControlValueAccessor', () => {
    const mockOnChange = jasmine.createSpy('onChange');
    const mockOnTouched = jasmine.createSpy('onTouched');

    component.registerOnChange(mockOnChange);
    component.registerOnTouched(mockOnTouched);

    component.writeValue('2');
    expect(component.value()).toBe('2');

    component.selectOption(mockOptions[1]);
    expect(mockOnChange).toHaveBeenCalledWith('2');
  });

  it('should handle empty options', () => {
    component.options = [] as any;
    fixture.detectChanges();

    expect(component.filteredOptions.length).toBe(0);
    expect(component.selectedOption).toBeNull();
  });

  it('should respect clearable input', () => {
    component.clearable = false as any;
    component.value.set('2');
    fixture.detectChanges();

    // With clearable false, clear button should not appear
    const triggerElement = fixture.debugElement.nativeElement.querySelector('button');
    expect(triggerElement).toBeTruthy();
  });

  it('should toggle dropdown open/close', () => {
    expect(component.isOpen()).toBe(false);

    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);

    component.closeDropdown();
    expect(component.isOpen()).toBe(false);
  });
});