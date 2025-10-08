import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthStateService } from '../../../core/state/auth-state.service';
import { AuthQuery } from '../../../core/state/auth.query';
import { validateEmail, validateUsername, validatePassword } from '../../../core/utils/validation';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading$ = this.authQuery.loading$;
  error$ = this.authQuery.error$;

  constructor(
    private fb: FormBuilder,
    private authStateService: AuthStateService,
    private authQuery: AuthQuery
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, this.usernameValidator]],
      email: ['', [Validators.required, this.emailValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  usernameValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return validateUsername(control.value) ? null : { invalidUsername: true };
  }

  emailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    return validateEmail(control.value) ? null : { invalidEmail: true };
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      const { username, email, password } = this.registerForm.value;

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return;
      }

      this.authStateService.register({
        username,
        email,
        password
      }).subscribe();
    }
  }

  get username() {
    return this.registerForm.get('username');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  get passwordMismatch() {
    return this.registerForm.errors?.['passwordMismatch'] &&
           this.confirmPassword?.touched;
  }
}
