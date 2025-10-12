import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthStateService } from '../../core/state/auth-state.service';
import { AuthQuery } from '../../core/state/auth.query';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  currentUser$ = this.authQuery.currentUser$;

  constructor(
    private authStateService: AuthStateService,
    private authQuery: AuthQuery,
    private router: Router
  ) {}

  logout(): void {
    this.authStateService.logout().subscribe();
  }
}
