import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { BracketMatch, LiveMatch, LiveSnapshot, MatchEventRecord } from './models';

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
}
