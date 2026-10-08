import { HttpClient } from '@angular/common/http';
import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface AuthUser {
  userId: number;
  username: string;
  roles: string[];
}

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  username: string;
  roles: string[];
}

interface Session {
  token: string;
  user: AuthUser;
}

export const AUTH_STORAGE_KEY = 'esportshub.auth';
export const ROLE_REFRESH_INTERVAL_MS = 30000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly session = signal<Session | null>(restoreSession());
  private lastRefresh = 0;
  private watching = false;

  readonly currentUser = computed(() => this.session()?.user ?? null);
  readonly isLoggedIn = computed(() => this.session() !== null);

  token(): string | null {
    return this.session()?.token ?? null;
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.roles.includes(role) ?? false;
  }

  login(request: LoginRequest): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>('/api/auth/login', request)
      .pipe(map((response) => this.startSession(response)));
  }

  register(request: RegisterRequest): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>('/api/auth/register', request)
      .pipe(map((response) => this.startSession(response)));
  }

  refreshRoles(): void {
    const username = this.currentUser()?.username;
    if (!username) {
      return;
    }
    this.lastRefresh = Date.now();
    this.http.get<{ username: string; roles: string[] }>('/api/me').subscribe({
      next: (me) => {
        const session = this.session();
        if (!session || session.user.username !== me.username) {
          return;
        }
        const roles = [...me.roles];
        if (roles.slice().sort().join() === session.user.roles.slice().sort().join()) {
          return;
        }
        this.store({ ...session, user: { ...session.user, roles } });
      },
      error: () => undefined,
    });
  }

  watchRoles(): void {
    if (this.watching) {
      return;
    }
    this.watching = true;
    this.refreshRoles();
    this.document.defaultView?.addEventListener('focus', () => {
      if (Date.now() - this.lastRefresh >= ROLE_REFRESH_INTERVAL_MS) {
        this.refreshRoles();
      }
    });
  }

  logout(): void {
    this.session.set(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {}
  }

  private startSession(response: AuthResponse): AuthUser {
    const session: Session = {
      token: response.token,
      user: { userId: response.userId, username: response.username, roles: [...response.roles] },
    };
    this.store(session);
    return session.user;
  }

  private store(session: Session): void {
    this.session.set(session);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  }
}

function restoreSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const session = JSON.parse(raw) as Session;
    if (typeof session?.token === 'string' && session.user && isTokenValid(session.token)) {
      return session;
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
  return null;
}

export function isTokenValid(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
    const { exp } = JSON.parse(atob(padded)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
