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
        loadComponent: () => import('./pages/uzivo/uzivo'),
      },
      {
        path: 'turniri',
        title: 'Turniri · EsportsHub',
        loadComponent: () => import('./pages/turniri/turniri'),
      },
      {
        path: 'turniri/novi',
        title: 'Novi turnir · EsportsHub',
        loadComponent: () => import('./pages/turniri/novi-turnir'),
      },
      {
        path: 'turniri/:id',
        title: 'Turnir · EsportsHub',
        loadComponent: () => import('./pages/turniri/turnir-detalji'),
      },
      {
        path: 'market',
        title: 'Market · EsportsHub',
        loadComponent: () => import('./pages/market/market'),
      },
      {
        path: 'timovi',
        title: 'Timovi · EsportsHub',
        loadComponent: () => import('./pages/timovi/timovi'),
      },
      {
        path: 'profil',
        title: 'Profil · EsportsHub',
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
