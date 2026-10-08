import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  BracketMatch,
  LiveMatch,
  LiveSnapshot,
  MatchEventRecord,
  Referee,
  RefereeMatch,
} from './models';

@Injectable({ providedIn: 'root' })
export class MatchesApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/matches';

  get(id: number): Observable<BracketMatch> {
    return this.http.get<BracketMatch>(`${this.base}/${id}`);
  }

  snapshot(id: number): Observable<LiveSnapshot | null> {
    return this.http.get<LiveSnapshot | null>(`${this.base}/${id}/live`);
  }

  events(id: number): Observable<MatchEventRecord[]> {
    return this.http.get<MatchEventRecord[]>(`${this.base}/${id}/events`);
  }

  live(): Observable<LiveMatch[]> {
    return this.http.get<LiveMatch[]>(`${this.base}/live`);
  }

  refereeMatches(): Observable<RefereeMatch[]> {
    return this.http.get<RefereeMatch[]>('/api/me/referee-matches');
  }

  referees(): Observable<Referee[]> {
    return this.http.get<Referee[]>('/api/referees');
  }

  assignReferee(id: number, username: string): Observable<BracketMatch> {
    return this.http.put<BracketMatch>(`${this.base}/${id}/referee`, { username });
  }

  start(id: number): Observable<BracketMatch> {
    return this.http.post<BracketMatch>(`${this.base}/${id}/start`, null);
  }

  updateScore(id: number, scoreA: number, scoreB: number): Observable<BracketMatch> {
    return this.http.put<BracketMatch>(`${this.base}/${id}/score`, { scoreA, scoreB });
  }

  finish(id: number, scoreA: number, scoreB: number): Observable<BracketMatch> {
    return this.http.post<BracketMatch>(`${this.base}/${id}/finish`, { scoreA, scoreB });
  }

  agentKey(id: number): Observable<{ matchKey: string }> {
    return this.http.get<{ matchKey: string }>(`${this.base}/${id}/agent-key`);
  }

  simulateSnapshot(id: number): Observable<unknown> {
    return this.http.post(`${this.base}/${id}/simulate-snapshot`, null);
  }
}
