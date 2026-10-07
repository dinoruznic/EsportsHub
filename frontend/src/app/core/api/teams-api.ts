import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Team } from './models';

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly http = inject(HttpClient);

  listByGame(gameId: number): Observable<Team[]> {
    return this.http.get<Team[]>('/api/teams', { params: { gameId } });
  }

  captainedBy(username: string, gameId: number): Observable<Team[]> {
    return this.listByGame(gameId).pipe(
      map((teams) => teams.filter((team) => team.captainUsername === username)),
    );
  }
}
