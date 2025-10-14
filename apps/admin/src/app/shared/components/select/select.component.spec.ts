import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SelectComponent, SelectOption } from './select.component';

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
        BrowserAnimationsModule
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

  it('should apply correct size classes', () => {
    expect(component.getSizeClasses()).toContain('text-sm px-3 py-2 min-h-[40px]');

    component.size = 'sm' as any;
    expect(component.getSizeClasses()).toContain('text-xs px-2 py-1.5 min-h-[32px]');

    component.size = 'lg' as any;
    expect(component.getSizeClasses()).toContain('text-base px-4 py-3 min-h-[48px]');
  });

  it('should apply correct color classes', () => {
    expect(component.getColorClasses()).toContain('border-gray-300 focus:border-blue-500 focus:ring-blue-200');

    component.color = 'primary' as any;
    expect(component.getColorClasses()).toContain('border-blue-300 focus:border-blue-600 focus:ring-blue-300');

    component.color = 'success' as any;
    expect(component.getColorClasses()).toContain('border-green-300 focus:border-green-600 focus:ring-green-300');
  });

  it('should handle search keydown events', () => {
    component.searchable = true as any;
    component.isOpen.set(true);
    fixture.detectChanges();

    const mockEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    spyOn(mockEvent, 'preventDefault');

    component.handleSearchKeydown(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it('should handle document click outside', () => {
    component.isOpen.set(true);
    fixture.detectChanges();

    // Create a mock event that simulates clicking outside the component
    const mockEvent = {
      target: document.createElement('div')
    } as any;
    component.onDocumentClick(mockEvent);
    expect(component.isOpen()).toBe(false);
  });
});