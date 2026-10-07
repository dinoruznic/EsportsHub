import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { storeSession } from '../../testing/fake-session';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  }

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    controller.verify();
    localStorage.clear();
  });

  it('adds the bearer token to /api requests when logged in', () => {
    const token = storeSession();
    setup();

    http.get('/api/teams').subscribe();

    expect(controller.expectOne('/api/teams').request.headers.get('Authorization')).toBe(`Bearer ${token}`);
  });

  it('does not add the header for guests or non-api urls', () => {
    setup();
    http.get('/api/teams').subscribe();
    expect(controller.expectOne('/api/teams').request.headers.has('Authorization')).toBe(false);

    TestBed.resetTestingModule();
    storeSession();
    setup();
    http.get('/landing/lol.webp').subscribe();
    expect(controller.expectOne('/landing/lol.webp').request.headers.has('Authorization')).toBe(false);
  });

  it('logs out and goes to the landing page on 401', () => {
    storeSession();
    setup();

    http.get('/api/me/game-accounts').subscribe({ error: () => {} });
    controller.expectOne('/api/me/game-accounts').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('does not log out or redirect on 401 from login', () => {
    storeSession();
    setup();

    http.post('/api/auth/login', {}).subscribe({ error: () => {} });
    controller.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });
});
