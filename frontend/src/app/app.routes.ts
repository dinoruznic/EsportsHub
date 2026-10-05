import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'turniri' },
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
  {
    path: 'prijava',
    title: 'Prijava · EsportsHub',
    data: { area: 'Prijava' },
    loadComponent: () => import('./pages/prijava/prijava'),
  },
  {
    path: 'registracija',
    title: 'Registracija · EsportsHub',
    data: { area: 'Registracija' },
    loadComponent: () => import('./pages/registracija/registracija'),
  },
  {
    path: '**',
    title: 'Stranica ne postoji · EsportsHub',
    data: { area: 'Greška' },
    loadComponent: () => import('./pages/not-found/not-found'),
  },
];
