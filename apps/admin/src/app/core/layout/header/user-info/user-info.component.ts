import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../state/auth.service';
import { AuthQuery } from '../../../../state/auth.query';
import { User } from '@pro/types';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-user-info',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.scss']
})
export class UserInfoComponent {
  currentUser$: Observable<User | null>;
  isDropdownOpen = false;

  constructor(
    private authQuery: AuthQuery,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser$ = this.authQuery.currentUser$;
  }

  getUserInitials(user: User | null): string {
    if (!user?.username) return '?';
    return user.username.charAt(0).toUpperCase();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  navigateToProfile(): void {
    this.isDropdownOpen = false;
    this.router.navigate(['/profile']);
  }

  logout(): void {
    this.isDropdownOpen = false;
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.user-info-container');

    if (!clickedInside && this.isDropdownOpen) {
      this.isDropdownOpen = false;
    }
  }
}
