import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Bracket, CreateTournamentRequest, Registration, Tournament } from './models';

@Injectable({ providedIn: 'root' })
export class TournamentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/tournaments';

  list(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(this.base);
  }

  get(id: number): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.base}/${id}`);
  }

  pending(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.base}/pending`);
  }

  create(request: CreateTournamentRequest): Observable<Tournament> {
    return this.http.post<Tournament>(this.base, request);
  }

  approve(id: number): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.base}/${id}/approve`, null);
  }

  reject(id: number): Observable<Tournament> {
    return this.http.post<Tournament>(`${this.base}/${id}/reject`, null);
  }

  registrations(id: number): Observable<Registration[]> {
    return this.http.get<Registration[]>(`${this.base}/${id}/registrations`);
  }

  register(id: number, teamId: number): Observable<Registration> {
    return this.http.post<Registration>(`${this.base}/${id}/registrations`, { teamId });
  }

  withdraw(id: number, registrationId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/registrations/${registrationId}`);
  }

  bracket(id: number): Observable<Bracket> {
    return this.http.get<Bracket>(`${this.base}/${id}/bracket`);
  }

  generateBracket(id: number): Observable<Bracket> {
    return this.http.post<Bracket>(`${this.base}/${id}/bracket`, null);
  }
}
