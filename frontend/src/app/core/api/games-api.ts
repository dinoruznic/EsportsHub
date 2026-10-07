import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { Game } from './models';

@Injectable({ providedIn: 'root' })
export class GamesApi {
  private readonly http = inject(HttpClient);
  private cache: Observable<Game[]> | null = null;

  list(): Observable<Game[]> {
    if (!this.cache) {
      this.cache = this.http.get<Game[]>('/api/games').pipe(
        catchError((error: unknown) => {
          this.cache = null;
          return throwError(() => error);
        }),
        shareReplay(1),
      );
    }
    return this.cache;
  }
}
