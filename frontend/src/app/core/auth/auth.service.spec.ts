import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AUTH_STORAGE_KEY, AuthResponse, AuthService } from './auth.service';
import { fakeJwt, storeSession } from '../../testing/fake-session';

describe('AuthService', () => {
  let http: HttpTestingController;

  function setup(): AuthService {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(AuthService);
  }

  function response(token = fakeJwt(3600)): AuthResponse {
    return { token, tokenType: 'Bearer', userId: 7, username: 'marko', roles: ['PLAYER'] };
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('starts logged out without a stored session', () => {
    const auth = setup();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.currentUser()).toBeNull();
  });

  it('stores token and user after login', () => {
    const auth = setup();
    const token = fakeJwt(3600);

    auth.login({ usernameOrEmail: 'marko', password: 'lozinka123' }).subscribe();
    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ usernameOrEmail: 'marko', password: 'lozinka123' });
    req.flush(response(token));

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.currentUser()).toEqual({ userId: 7, username: 'marko', roles: ['PLAYER'] });
    expect(auth.token()).toBe(token);
    expect(auth.hasRole('PLAYER')).toBe(true);
    expect(auth.hasRole('ADMIN')).toBe(false);
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!)).toEqual({
      token,
      user: { userId: 7, username: 'marko', roles: ['PLAYER'] },
    });
  });

  it('logs in with the response of a successful registration', () => {
    const auth = setup();

    auth
      .register({ username: 'marko', email: 'marko@example.com', password: 'lozinka123', displayName: '' })
      .subscribe();
    http.expectOne('/api/auth/register').flush(response(), { status: 201, statusText: 'Created' });

    expect(auth.currentUser()?.username).toBe('marko');
  });

  it('clears the session on logout', () => {
    storeSession();
    const auth = setup();
    expect(auth.isLoggedIn()).toBe(true);

    auth.logout();

    expect(auth.isLoggedIn()).toBe(false);
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('restores a session whose token has not expired', () => {
    storeSession(3600);
    const auth = setup();

    expect(auth.currentUser()?.username).toBe('admin');
  });

  it('does not restore an expired token', () => {
    storeSession(-60);
    const auth = setup();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it('ignores a corrupted stored session', () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{nije json');
    const auth = setup();

    expect(auth.isLoggedIn()).toBe(false);
  });
});
