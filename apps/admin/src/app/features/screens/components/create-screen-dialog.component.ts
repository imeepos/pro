import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ModalRef } from '../../../core/services/modal.service';
import { CreateScreenDto } from '../../../core/services/screen-api.service';

@Component({
  selector: 'app-create-screen-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-screen-dialog.component.html',
  styleUrls: ['./create-screen-dialog.component.scss']
})
export class CreateScreenDialogComponent implements OnInit {
  modalRef!: ModalRef<void, CreateScreenDto>;
  form!: FormGroup;
  submitting = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
      description: ['', [Validators.maxLength(200)]],
      width: [1920, [Validators.required, Validators.min(100), Validators.max(7680)]],
      height: [1080, [Validators.required, Validators.min(100), Validators.max(7680)]],
      background: ['#0f1419', [Validators.required]],
      gridEnabled: [true],
      gridSize: [10, [Validators.required, Validators.min(1), Validators.max(100)]]
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

  get gridSizeControl() {
    return this.form.get('gridSize');
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
        height: formValue.height,
        background: formValue.background,
        grid: {
          enabled: formValue.gridEnabled,
          size: formValue.gridSize
        }
      },
      components: []
    };

    this.modalRef.close(dto);
  }

  cancel(): void {
    this.modalRef.dismiss();
  }
}
