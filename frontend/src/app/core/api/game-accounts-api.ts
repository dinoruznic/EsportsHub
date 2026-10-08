import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GameAccount, GameAccountRequest } from './models';

@Injectable({ providedIn: 'root' })
export class GameAccountsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/me/game-accounts';

  listMine(): Observable<GameAccount[]> {
    return this.http.get<GameAccount[]>(this.base);
  }

  create(request: GameAccountRequest): Observable<GameAccount> {
    return this.http.post<GameAccount>(this.base, request);
  }

  update(id: number, request: GameAccountRequest): Observable<GameAccount> {
    return this.http.put<GameAccount>(`${this.base}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
