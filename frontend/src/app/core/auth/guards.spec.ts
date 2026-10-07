import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './guards';
import { storeSession, TEST_USER } from '../../testing/fake-session';

describe('guards', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  function run(guard: CanActivateFn): boolean | string {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : (result as boolean);
  }

  it('authGuard sends guests to the landing page', () => {
    expect(run(authGuard)).toBe('/');
  });

  it('authGuard lets logged-in users through', () => {
    storeSession();
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard sends logged-in users to /turniri', () => {
    storeSession();
    expect(run(guestGuard)).toBe('/turniri');
  });

  it('guestGuard lets guests through', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it('roleGuard checks the role of the logged-in user', () => {
    storeSession(3600, { ...TEST_USER, roles: ['PLAYER'] });
    expect(run(roleGuard('ADMIN'))).toBe('/turniri');

    TestBed.resetTestingModule();
    expect(run(roleGuard('PLAYER'))).toBe(true);
  });
});
