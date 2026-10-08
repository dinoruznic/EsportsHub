import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, shareReplay, throwError } from 'rxjs';
import { Game, GameOption } from './models';

export interface GameOptions {
  regions: GameOption[];
  positions: GameOption[];
  ranks: GameOption[];
}

@Injectable({ providedIn: 'root' })
export class GamesApi {
  private readonly http = inject(HttpClient);
  private cache: Observable<Game[]> | null = null;
  private readonly optionCache = new Map<string, Observable<GameOption[]>>();

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

  regions(gameId: number): Observable<GameOption[]> {
    return this.options(gameId, 'regions');
  }

  positions(gameId: number): Observable<GameOption[]> {
    return this.options(gameId, 'positions');
  }

  ranks(gameId: number): Observable<GameOption[]> {
    return this.options(gameId, 'ranks');
  }

  allOptions(gameId: number): Observable<GameOptions> {
    return forkJoin({
      regions: this.regions(gameId),
      positions: this.positions(gameId),
      ranks: this.ranks(gameId),
    });
  }

  private options(gameId: number, kind: 'regions' | 'positions' | 'ranks'): Observable<GameOption[]> {
    const key = `${gameId}/${kind}`;
    let cached = this.optionCache.get(key);
    if (!cached) {
      cached = this.http.get<GameOption[]>(`/api/games/${gameId}/${kind}`).pipe(
        catchError((error: unknown) => {
          this.optionCache.delete(key);
          return throwError(() => error);
        }),
        shareReplay(1),
      );
      this.optionCache.set(key, cached);
    }
    return cached;
  }
}
