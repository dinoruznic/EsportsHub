import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/guards';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'EsportsHub',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/landing/landing'),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: 'uzivo',
        title: 'Uživo · EsportsHub',
        data: { area: 'Uživo' },
        loadComponent: () => import('./pages/uzivo/uzivo'),
      },
      {
        path: 'turniri',
        title: 'Turniri · EsportsHub',
        data: { area: 'Turniri' },
        loadComponent: () => import('./pages/turniri/turniri'),
      },
      {
        path: 'market',
        title: 'Market · EsportsHub',
        data: { area: 'Market' },
        loadComponent: () => import('./pages/market/market'),
      },
      {
        path: 'timovi',
        title: 'Timovi · EsportsHub',
        data: { area: 'Timovi' },
        loadComponent: () => import('./pages/timovi/timovi'),
      },
      {
        path: 'profil',
        title: 'Profil · EsportsHub',
        data: { area: 'Profil' },
        loadComponent: () => import('./pages/profil/profil'),
      },
    ],
  },
  {
    path: '**',
    title: 'Stranica ne postoji · EsportsHub',
    loadComponent: () => import('./pages/not-found/not-found'),
  },
];
