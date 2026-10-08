import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Contract, CreateTeamRequest, Team, TeamDetail, TeamMember } from './models';

@Injectable({ providedIn: 'root' })
export class TeamsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/teams';

  list(): Observable<Team[]> {
    return this.http.get<Team[]>(this.base);
  }

  listByGame(gameId: number): Observable<Team[]> {
    return this.http.get<Team[]>(this.base, { params: { gameId } });
  }

  captainedBy(username: string, gameId: number): Observable<Team[]> {
    return this.listByGame(gameId).pipe(
      map((teams) => teams.filter((team) => team.captainUsername === username)),
    );
  }

  get(id: number): Observable<TeamDetail> {
    return this.http.get<TeamDetail>(`${this.base}/${id}`);
  }

  create(request: CreateTeamRequest): Observable<Team> {
    return this.http.post<Team>(this.base, request);
  }

  addMember(teamId: number, gameAccountId: number): Observable<TeamMember> {
    return this.http.post<TeamMember>(`${this.base}/${teamId}/members`, { gameAccountId });
  }

  removeMember(teamId: number, membershipId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${teamId}/members/${membershipId}`);
  }

  contracts(teamId: number): Observable<Contract[]> {
    return this.http.get<Contract[]>(`/api/market/teams/${teamId}/contracts`);
  }
}
