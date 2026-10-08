import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AdminStats, AdminUser, Page } from '../../core/api/models';
import { storeSession } from '../../testing/fake-session';
import { GAMES, tournament } from '../../testing/tournament-data';
import Admin from './admin';

async function settle(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

async function navigated(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await settle(5);
}

const STATS: AdminStats = {
  users: 1234,
  teams: 71,
  tournamentsByStatus: {
    PENDING: 2,
    REGISTRATION: 8,
    ONGOING: 6,
    COMPLETED: 5,
    REJECTED: 1,
    CANCELLED: 0,
  },
  liveMatches: 3,
  openListings: 4,
};

function user(id: number, username: string, roles: string[], displayName: string | null = null) {
  return {
    id,
    username,
    displayName,
    email: `${username}@esportshub.local`,
    roles,
    createdAt: '2026-09-08T10:00:00Z',
  } satisfies AdminUser;
}

function page(content: AdminUser[], number = 0, totalPages = 1): Page<AdminUser> {
  return { content, page: number, size: 20, totalElements: content.length, totalPages };
}

const USERS = [
  user(1, 'admin', ['ADMIN', 'ORGANIZER'], 'Administrator'),
  user(2, 'amra', ['PLAYER'], 'Amra Hodžić'),
  user(3, 'sudo', ['PLAYER', 'REFEREE']),
];

describe('Admin', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(url: string): Promise<void> {
    localStorage.clear();
    storeSession();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'admin', component: Admin }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
    http.expectOne('/api/admin/stats').flush(STATS);
    http.expectOne('/api/games').flush(GAMES);
    element = harness.routeNativeElement as HTMLElement;
  }

  async function renderUsers(url = '/admin?tab=korisnici', users = page(USERS)) {
    await render(url);
    const request = http.expectOne((r) => r.url === '/api/admin/users');
    request.flush(users);
    await harness.fixture.whenStable();
    return request.request.params;
  }

  function text(selector: string, root: ParentNode = element): string {
    return root.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  function rowChips(username: string): string[] {
    return Array.from(
      element.querySelectorAll(`tr[data-username="${username}"] app-role-chip`),
    ).map((chip) => chip.textContent!.trim());
  }

  it('shows the header, the tabs with the pending badge and the stat tiles', async () => {
    await render('/admin');
    await harness.fixture.whenStable();

    expect(text('.eyebrow')).toBe('Upravljanje');
    expect(text('h1')).toBe('Admin');
    expect(Array.from(element.querySelectorAll('.tab')).map((t) => t.textContent!.trim())).toEqual([
      'Pregled',
      'Korisnici',
      'Turniri na čekanju 2',
    ]);
    const tiles = Array.from(element.querySelectorAll('.tile')).map(
      (tile) => `${text('.tile-label', tile)}=${text('.tile-value', tile)}`,
    );
    expect(tiles).toEqual([
      'Korisnici=1.234',
      'Timovi=71',
      'Turniri u toku=6',
      'Na odobrenju=2',
      'Mečevi uživo=3',
      'Otvoreni oglasi=4',
    ]);
    expect(element.querySelector('[data-tile="live"] .live-dot')).not.toBeNull();
    expect(element.querySelector('[data-tile="ongoing"]')!.getAttribute('href')).toBe(
      '/turniri?status=u-toku',
    );
    expect(element.querySelector('[data-tile="listings"]')!.getAttribute('href')).toBe('/market');
    expect(text('.status-row[data-status="REGISTRATION"] .status-name')).toBe('Prijave otvorene');
    expect(text('.status-row[data-status="REGISTRATION"] .status-count')).toBe('8');
    expect(
      element.querySelector('.status-row[data-status="COMPLETED"] a')!.getAttribute('href'),
    ).toBe('/turniri?status=zavrseni');
  });

  it('lists users with monogram, names, email, Bosnian role chips and pagination', async () => {
    const params = await renderUsers('/admin?tab=korisnici', page(USERS, 0, 4));

    expect(params.get('query')).toBe('');
    expect(params.get('role')).toBe('');
    expect(params.get('page')).toBe('0');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    const amra = element.querySelector('tr[data-username="amra"]')!;
    expect(text('.display-name', amra)).toBe('Amra Hodžić');
    expect(amra.querySelector('.display-name')!.getAttribute('href')).toBe('/igraci/amra');
    expect(text('.handle', amra)).toBe('@amra');
    expect(text('.email', amra)).toBe('amra@esportshub.local');
    expect(amra.querySelector('app-team-hex')!.textContent).toContain('AH');
    expect(rowChips('admin')).toEqual(['ORGANIZATOR', 'ADMIN']);
    expect(rowChips('sudo')).toEqual(['IGRAČ', 'SUDIJA']);
    expect(text('.display-name', element.querySelector('tr[data-username="sudo"]')!)).toBe('sudo');
    expect(text('.page-info')).toBe('Stranica 1 od 4');
    expect(element.querySelector<HTMLButtonElement>('.prev')!.disabled).toBe(true);

    element.querySelector<HTMLButtonElement>('.next')!.click();
    await navigated();
    const next = http.expectOne((r) => r.url === '/api/admin/users');
    expect(next.request.params.get('page')).toBe('1');
    next.flush(page(USERS, 1, 4));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin?tab=korisnici&stranica=2');
    expect(text('.page-info')).toBe('Stranica 2 od 4');
  });

  it('searches with a debounce and filters by role through the query params', async () => {
    await renderUsers();
    const input = element.querySelector<HTMLInputElement>('.search-input')!;

    input.value = 'am';
    input.dispatchEvent(new Event('input'));
    input.value = 'amra';
    input.dispatchEvent(new Event('input'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    await navigated();
    const searched = http.expectOne((r) => r.url === '/api/admin/users');
    expect(searched.request.params.get('query')).toBe('amra');
    searched.flush(page([USERS[1]]));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin?tab=korisnici&q=amra');
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);

    element.querySelector<HTMLButtonElement>('[data-role-filter="sudije"]')!.click();
    await navigated();
    const filtered = http.expectOne((r) => r.url === '/api/admin/users');
    expect(filtered.request.params.get('role')).toBe('REFEREE');
    expect(filtered.request.params.get('query')).toBe('amra');
    filtered.flush(page([]));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/admin?tab=korisnici&q=amra&uloga=sudije');
    expect(element.querySelector('[data-role-filter="sudije"]')!.getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(text('app-empty-state')).toContain('Nema korisnika za ovu pretragu.');
  });

  it('grants and revokes roles from the drawer and updates the chips', async () => {
    await renderUsers();

    element.querySelector<HTMLButtonElement>('tr[data-username="amra"] .edit-roles')!.click();
    await harness.fixture.whenStable();
    const drawer = () => element.querySelector('app-user-roles-drawer')!;
    const toggle = (role: string) =>
      drawer().querySelector<HTMLButtonElement>(`[data-role="${role}"] .switch`)!;

    expect(text('.title', drawer())).toBe('Amra Hodžić');
    expect(text('.fixed app-role-chip', drawer())).toBe('IGRAČ');
    expect(toggle('ORGANIZER').getAttribute('aria-checked')).toBe('false');

    toggle('ORGANIZER').click();
    const grant = http.expectOne({ method: 'POST', url: '/api/admin/users/amra/roles' });
    expect(grant.request.body).toEqual({ role: 'ORGANIZER' });
    grant.flush(['ORGANIZER', 'PLAYER']);
    await harness.fixture.whenStable();

    expect(toggle('ORGANIZER').getAttribute('aria-checked')).toBe('true');
    expect(rowChips('amra')).toEqual(['IGRAČ', 'ORGANIZATOR']);

    toggle('ORGANIZER').click();
    http
      .expectOne({ method: 'DELETE', url: '/api/admin/users/amra/roles/ORGANIZER' })
      .flush(['PLAYER']);
    await harness.fixture.whenStable();

    expect(rowChips('amra')).toEqual(['IGRAČ']);
  });

  it('asks before removing the admin role and shows backend errors in Bosnian', async () => {
    await renderUsers('/admin?tab=korisnici', page([user(4, 'drugi', ['PLAYER', 'ADMIN'])]));

    element.querySelector<HTMLButtonElement>('.edit-roles')!.click();
    await harness.fixture.whenStable();
    const drawer = element.querySelector('app-user-roles-drawer')!;
    drawer.querySelector<HTMLButtonElement>('[data-role="ADMIN"] .switch')!.click();
    await harness.fixture.whenStable();

    http.expectNone((r) => r.method === 'DELETE');
    expect(text('.admin-confirm .question', drawer)).toBe('Ukloniti admin ulogu?');

    drawer.querySelector<HTMLButtonElement>('.admin-confirm .confirm')!.click();
    http
      .expectOne({ method: 'DELETE', url: '/api/admin/users/drugi/roles/ADMIN' })
      .flush({ message: 'Korisnik nema ovu ulogu' }, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();

    expect(text('.error', drawer)).toBe('Korisnik nema ovu ulogu.');
    expect(rowChips('drugi')).toEqual(['IGRAČ', 'ADMIN']);
  });

  it('disables the own admin toggle with a hint', async () => {
    await renderUsers();

    element.querySelector<HTMLButtonElement>('tr[data-username="admin"] .edit-roles')!.click();
    await harness.fixture.whenStable();
    const admin = element.querySelector('app-user-roles-drawer [data-role="ADMIN"]')!;

    expect(admin.querySelector<HTMLButtonElement>('.switch')!.disabled).toBe(true);
    expect(admin.querySelector('.switch')!.getAttribute('aria-checked')).toBe('true');
    expect(text('.toggle-hint', admin)).toBe('Ne možeš ukloniti svoju admin ulogu.');
    expect(
      element.querySelector<HTMLButtonElement>(
        'app-user-roles-drawer [data-role="ORGANIZER"] .switch',
      )!.disabled,
    ).toBe(false);
  });

  it('approves and rejects pending tournaments on their own tab', async () => {
    await render('/admin?tab=na-cekanju');
    http
      .expectOne('/api/tournaments/pending')
      .flush([
        tournament({ id: 9, name: 'Novi Kup', status: 'PENDING' }),
        tournament({ id: 10, name: 'Drugi Kup', status: 'PENDING' }),
      ]);
    await harness.fixture.whenStable();

    const first = element.querySelector('[data-pending-id="9"]')!;
    expect(first.querySelector('a.name')!.getAttribute('href')).toBe('/turniri/9');

    first.querySelector<HTMLButtonElement>('.approve')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/tournaments/9/approve' })
      .flush(tournament({ id: 9 }));
    await settle();
    http
      .expectOne('/api/tournaments/pending')
      .flush([tournament({ id: 10, name: 'Drugi Kup', status: 'PENDING' })]);
    http
      .expectOne('/api/admin/stats')
      .flush({ ...STATS, tournamentsByStatus: { ...STATS.tournamentsByStatus, PENDING: 1 } });
    await harness.fixture.whenStable();

    expect(element.querySelector('[data-pending-id="9"]')).toBeNull();
    expect(text('[data-tab="na-cekanju"] .badge')).toBe('1');

    const second = element.querySelector('[data-pending-id="10"]')!;
    second.querySelector<HTMLButtonElement>('.trigger')!.click();
    await harness.fixture.whenStable();
    second.querySelector<HTMLButtonElement>('.confirm')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/tournaments/10/reject' })
      .flush(tournament({ id: 10 }));
    await settle();
    http.expectOne('/api/tournaments/pending').flush([]);
    http
      .expectOne('/api/admin/stats')
      .flush({ ...STATS, tournamentsByStatus: { ...STATS.tournamentsByStatus, PENDING: 0 } });
    await harness.fixture.whenStable();

    expect(element.querySelector('[data-tab="na-cekanju"] .badge')).toBeNull();
    expect(text('app-pending-tournaments .none')).toBe('Nema turnira koji čekaju odobrenje.');
  });

  it('resets demo data after a confirmation and lists the demo accounts', async () => {
    await render('/admin');
    await harness.fixture.whenStable();
    const demo = () => element.querySelector('app-admin-demo')!;

    expect(text('.section-title', demo())).toBe('Demo');
    expect(demo().querySelectorAll('tbody tr')).toHaveLength(8);
    expect(text('[data-account="dino"] .password', demo())).toBe('lozinka123');
    expect(text('[data-account="admin"] .password', demo())).toBe('admin12345');
    expect(text('[data-account="sudija_amra"] app-role-chip', demo())).toBe('SUDIJA');

    demo().querySelector<HTMLButtonElement>('.reset .trigger')!.click();
    await harness.fixture.whenStable();
    http.expectNone('/api/admin/demo/reset');
    expect(text('.reset .question', demo())).toBe(
      'Ovo briše sve podatke osim admin naloga i puni bazu demo podacima.',
    );

    demo().querySelector<HTMLButtonElement>('.reset .confirm')!.click();
    await harness.fixture.whenStable();
    expect(text('.progress', demo())).toBe('Punim bazu demo podacima…');
    http
      .expectOne({ method: 'POST', url: '/api/admin/demo/reset' })
      .flush({ users: 60, teams: 10, tournaments: 4, listings: 4 });
    await settle();
    http.expectOne('/api/admin/stats').flush({ ...STATS, users: 60 });
    await harness.fixture.whenStable();

    expect(text('.success-title', demo())).toBe('Demo podaci su spremni');
    expect(text('.success-text', demo())).toBe('Korisnici 60 · Timovi 10 · Turniri 4 · Oglasi 4');
    expect(text('[data-tile="users"] .tile-value')).toBe('60');
  });

  it('explains when the demo is disabled on the server', async () => {
    await render('/admin');
    await harness.fixture.whenStable();
    const demo = element.querySelector('app-admin-demo')!;

    demo.querySelector<HTMLButtonElement>('.reset .trigger')!.click();
    await harness.fixture.whenStable();
    demo.querySelector<HTMLButtonElement>('.reset .confirm')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/admin/demo/reset' })
      .flush(null, { status: 404, statusText: 'Not Found' });
    await harness.fixture.whenStable();

    expect(text('.error', demo)).toBe('Demo režim je isključen na serveru.');
    expect(demo.querySelector('.success')).toBeNull();
  });
});
