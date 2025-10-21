import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthStateService } from '../../../core/state/auth-state.service';
import { AuthQuery } from '../../../core/state/auth.query';
import { validatePassword } from '@pro/utils';
import { SvgIconComponent } from '../../../shared/components/svg-icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SvgIconComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  loading$ = this.authQuery.loading$;
  error$ = this.authQuery.error$;

  constructor(
    private fb: FormBuilder,
    private authStateService: AuthStateService,
    private authQuery: AuthQuery
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const { usernameOrEmail, password } = this.loginForm.value;

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return;
      }

      this.authStateService.login({
        usernameOrEmail,
        password
      }).subscribe();
    }
  }

  get usernameOrEmail() {
    return this.loginForm.get('usernameOrEmail');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
