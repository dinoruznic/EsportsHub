import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { storeSession } from '../../testing/fake-session';
import { RoleChip } from '../../shared/role-chip/role-chip';
import { AUTH_STORAGE_KEY, AuthService } from './auth.service';
import { roleLabel, sortRoles } from './roles';

describe('roles', () => {
  afterEach(() => localStorage.clear());

  it('maps roles to Bosnian labels', () => {
    expect(roleLabel('PLAYER')).toBe('IGRAČ');
    expect(roleLabel('ORGANIZER')).toBe('ORGANIZATOR');
    expect(roleLabel('REFEREE')).toBe('SUDIJA');
    expect(roleLabel('ADMIN')).toBe('ADMIN');
    expect(roleLabel('NEPOZNATO')).toBe('NEPOZNATO');
  });

  it('orders roles from player to admin', () => {
    expect(sortRoles(['ADMIN', 'REFEREE', 'PLAYER', 'ORGANIZER'])).toEqual([
      'PLAYER',
      'ORGANIZER',
      'REFEREE',
      'ADMIN',
    ]);
  });

  it('renders the admin chip in gold styling', async () => {
    const fixture = TestBed.createComponent(RoleChip);
    fixture.componentRef.setInput('role', 'ADMIN');
    await fixture.whenStable();
    const chip = fixture.nativeElement as HTMLElement;

    expect(chip.textContent).toBe('ADMIN');
    expect(chip.getAttribute('data-role')).toBe('ADMIN');
  });

  it('refreshes the roles from /api/me on start and on focus at most every 30 s', () => {
    storeSession(3600, { userId: 7, username: 'amra', roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

    auth.watchRoles();
    http.expectOne('/api/me').flush({ username: 'amra', roles: ['PLAYER', 'ORGANIZER'] });

    expect(auth.hasRole('ORGANIZER')).toBe(true);
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)!).user.roles).toEqual([
      'PLAYER',
      'ORGANIZER',
    ]);

    window.dispatchEvent(new Event('focus'));
    http.expectNone('/api/me');

    auth.watchRoles();
    http.expectNone('/api/me');
    http.verify();
  });

  it('ignores a failed refresh and keeps the session', () => {
    storeSession(3600, { userId: 7, username: 'amra', roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);

    auth.refreshRoles();
    http.expectOne('/api/me').flush(null, { status: 500, statusText: 'Server Error' });

    expect(auth.currentUser()?.roles).toEqual(['PLAYER']);
  });
});
