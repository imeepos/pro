import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../../state/auth.service';
import { AuthQuery } from '../../../state/auth.query';
import { validateEmail, validatePassword } from '@pro/utils';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private authQuery: AuthQuery,
    private toastService: ToastService
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
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required, this.usernameOrEmailValidator]],
      password: ['', [Validators.required, this.passwordValidator]]
    });
  }

  private usernameOrEmailValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const isEmail = value.includes('@');
    if (isEmail) {
      return validateEmail(value) ? null : { invalidEmail: true };
    }

    return value.length >= 3 ? null : { invalidUsername: true };
  }

  private passwordValidator(control: any) {
    const value = control.value;
    if (!value) return null;

    const result = validatePassword(value);
    return result.valid ? null : { invalidPassword: result.errors[0] };
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.authService.login(this.loginForm.value).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.toastService.success('登录成功');
      },
      error: (error) => {
        this.toastService.error(error?.message || '登录失败');
      }
    });
  }

  getFieldError(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return fieldName === 'usernameOrEmail' ? '用户名或邮箱不能为空' : '密码不能为空';
    }

    if (control.errors['invalidEmail']) {
      return '请输入有效的邮箱地址';
    }

    if (control.errors['invalidUsername']) {
      return '用户名长度至少为 3 位';
    }

    if (control.errors['invalidPassword']) {
      return control.errors['invalidPassword'];
    }

    return '';
  }
}
