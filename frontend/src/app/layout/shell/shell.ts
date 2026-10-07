import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  path: string;
  icon: string[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.currentUser;

  protected readonly nav: NavItem[] = [
    {
      label: 'Uživo',
      path: '/uzivo',
      icon: [
        'M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0',
        'M16.24 7.76a6 6 0 0 1 0 8.48',
        'M7.76 16.24a6 6 0 0 1 0-8.48',
        'M19.07 4.93a10 10 0 0 1 0 14.14',
        'M4.93 19.07a10 10 0 0 1 0-14.14',
      ],
    },
    {
      label: 'Turniri',
      path: '/turniri',
      icon: [
        'M7 4h10v5a5 5 0 0 1-10 0V4Z',
        'M7 6H4v1a3 3 0 0 0 3.6 2.9',
        'M17 6h3v1a3 3 0 0 1-3.6 2.9',
        'M12 14v4',
        'M8 20h8',
      ],
    },
    {
      label: 'Market',
      path: '/market',
      icon: ['M4 8h14', 'M15 4l4 4-4 4', 'M20 16H6', 'M9 12l-4 4 4 4'],
    },
    {
      label: 'Timovi',
      path: '/timovi',
      icon: [
        'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
        'M2.5 20a6.5 6.5 0 0 1 13 0',
        'M15.5 4.3a3.5 3.5 0 0 1 0 6.4',
        'M18 14.2a6.5 6.5 0 0 1 3.5 5.8',
      ],
    },
    {
      label: 'Profil',
      path: '/profil',
      icon: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4.5 20.5a7.5 7.5 0 0 1 15 0'],
    },
  ];

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
