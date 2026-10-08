import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { GameAccount, PlayerProfile } from './models';

@Injectable({ providedIn: 'root' })
export class PlayersApi {
  private readonly http = inject(HttpClient);

  get(username: string): Observable<PlayerProfile> {
    return this.http.get<PlayerProfile>(`/api/players/${encodeURIComponent(username)}`);
  }

  gameAccounts(username: string): Observable<GameAccount[]> {
    return this.http.get<GameAccount[]>(
      `/api/players/${encodeURIComponent(username)}/game-accounts`,
    );
  }
}
