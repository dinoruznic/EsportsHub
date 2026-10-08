import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminStats, AdminUser, DemoResetSummary, Page } from './models';

export interface AdminUserQuery {
  query: string;
  role: string;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/admin';

  users(query: AdminUserQuery): Observable<Page<AdminUser>> {
    const params = new HttpParams()
      .set('query', query.query)
      .set('role', query.role)
      .set('page', query.page)
      .set('size', query.size);
    return this.http.get<Page<AdminUser>>(`${this.base}/users`, { params });
  }

  grantRole(username: string, role: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.base}/users/${encodeURIComponent(username)}/roles`, {
      role,
    });
  }

  revokeRole(username: string, role: string): Observable<string[]> {
    return this.http.delete<string[]>(
      `${this.base}/users/${encodeURIComponent(username)}/roles/${role}`,
    );
  }

  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }

  resetDemo(): Observable<DemoResetSummary> {
    return this.http.post<DemoResetSummary>(`${this.base}/demo/reset`, null);
  }
}
