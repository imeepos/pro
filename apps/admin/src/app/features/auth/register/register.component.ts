import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../state/auth.service';
import { AuthQuery } from '../../../state/auth.query';
import { validateEmail, validateUsername, validatePassword } from '@pro/utils';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private authQuery: AuthQuery
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loading$ = this.authQuery.loading$;
    this.error$ = this.authQuery.error$;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, this.usernameValidator]],
      email: ['', [Validators.required, this.emailValidator]],
      password: ['', [Validators.required, this.passwordValidator]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private usernameValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    return validateUsername(value) ? null : { invalidUsername: true };
  }

  private emailValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    return validateEmail(value) ? null : { invalidEmail: true };
  }

  private passwordValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const result = validatePassword(value);
    return result.valid ? null : { invalidPassword: result.errors[0] };
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;

    if (!password || !confirmPassword) return null;

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { username, email, password } = this.registerForm.value;

    this.authService.register({ username, email, password }).pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }

  getFieldError(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      const fieldNames: Record<string, string> = {
        username: '用户名',
        email: '邮箱',
        password: '密码',
        confirmPassword: '确认密码'
      };
      return `${fieldNames[fieldName]}不能为空`;
    }

    if (control.errors['invalidUsername']) {
      return '用户名长度为 3-20 位，只能包含字母、数字、下划线和连字符';
    }

    if (control.errors['invalidEmail']) {
      return '请输入有效的邮箱地址';
    }

    if (control.errors['invalidPassword']) {
      return control.errors['invalidPassword'];
    }

    return '';
  }

  getPasswordMismatchError(): string {
    const form = this.registerForm;
    const confirmPasswordControl = form.get('confirmPassword');

    if (confirmPasswordControl?.touched && form.errors?.['passwordMismatch']) {
      return '两次输入的密码不一致';
    }

    return '';
  }
}
