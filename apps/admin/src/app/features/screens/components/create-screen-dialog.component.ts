import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CreateScreenDto } from '../../../core/services/screen-api.service';

@Component({
  selector: 'app-create-screen-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-screen-dialog.component.html',
  styleUrls: ['./create-screen-dialog.component.scss']
})
export class CreateScreenDialogComponent implements OnInit {
  @Output() close = new EventEmitter<CreateScreenDto>();
  @Output() cancelDialog = new EventEmitter<void>();

  form!: FormGroup;
  submitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      width: [1920, [Validators.required, Validators.min(800), Validators.max(10000)]],
      height: [1080, [Validators.required, Validators.min(600), Validators.max(10000)]]
    });
  }

  get nameControl() {
    return this.form.get('name');
  }

  get descriptionControl() {
    return this.form.get('description');
  }

  get widthControl() {
    return this.form.get('width');
  }

  get heightControl() {
    return this.form.get('height');
  }

  submit(): void {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.controls[key].markAsTouched();
      });
      return;
    }

    const formValue = this.form.value;
    const dto: CreateScreenDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      layout: {
        width: formValue.width,
        height: formValue.height
      },
      components: []
    };

    this.close.emit(dto);
  }

  cancel(): void {
    this.cancelDialog.emit();
  }
}
