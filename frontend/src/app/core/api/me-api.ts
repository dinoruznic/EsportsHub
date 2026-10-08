import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Me } from './models';

@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly http = inject(HttpClient);

  get(): Observable<Me> {
    return this.http.get<Me>('/api/me');
  }

  updateDisplayName(displayName: string): Observable<Me> {
    return this.http.put<Me>('/api/me', { displayName });
  }
}
