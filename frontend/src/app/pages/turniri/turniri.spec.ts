import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Tournament } from '../../core/api/models';
import { TEST_USER, storeSession } from '../../testing/fake-session';
import { GAMES, registration, tournament } from '../../testing/tournament-data';
import Turniri from './turniri';

const TOURNAMENTS: Tournament[] = [
  tournament({ id: 1, name: 'Balkan Kup', status: 'REGISTRATION', gameCode: 'LOL' }),
  tournament({ id: 2, name: 'Sarajevo Open', status: 'ONGOING', gameCode: 'CS2', prizePool: null }),
  tournament({ id: 3, name: 'Zimski Kup', status: 'COMPLETED', gameCode: 'LOL' }),
];

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

describe('Turniri', () => {
  let http: HttpTestingController;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(url = '/turniri', roles = ['PLAYER'], pending: Tournament[] = []) {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username: 'igrac', roles });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'turniri', component: Turniri }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
    http.expectOne('/api/games').flush(GAMES);
    http.expectOne('/api/tournaments').flush(TOURNAMENTS);
    await settle();
    http.expectOne('/api/tournaments/1/registrations').flush([
      registration(1, 1),
      registration(2, 2),
      registration(3, 3),
      registration(4, 4, { status: 'WITHDRAWN' }),
    ]);
    http.expectOne('/api/tournaments/2/registrations').flush([]);
    http.expectOne('/api/tournaments/3/registrations').flush([]);
    if (roles.includes('ADMIN')) {
      http.expectOne('/api/tournaments/pending').flush(pending);
    }
    await harness.fixture.whenStable();
    return { harness, element: harness.routeNativeElement as HTMLElement };
  }

  function cardNames(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('app-tournament-card h2')).map((h) => h.textContent!.trim());
  }

  it('renders a card for each tournament from the backend', async () => {
    const { element } = await render();
    const first = element.querySelector('[data-tournament-id="1"]')!;

    expect(cardNames(element)).toEqual(['Balkan Kup', 'Sarajevo Open', 'Zimski Kup']);
    expect(first.getAttribute('href')).toBe('/turniri/1');
    expect(first.querySelector('.count')!.textContent).toBe('3/8 timova');
    expect(first.querySelector('.prize')!.textContent).toBe('1.500 KM');
    expect(first.querySelector('app-status-chip')!.textContent!.trim()).toBe('Prijave otvorene');
    expect(first.textContent).toContain('Single elimination');
    expect(first.textContent).toContain('League of Legends');
  });

  it('shows Novi turnir to a logged-in user', async () => {
    const { element } = await render();

    expect(element.querySelector('a.create')?.getAttribute('href')).toBe('/turniri/novi');
  });

  it('filters by status and writes the filter to the query params', async () => {
    const { harness, element } = await render();
    const router = TestBed.inject(Router);

    element.querySelector<HTMLButtonElement>('[data-status-filter="u-toku"]')!.click();
    await harness.fixture.whenStable();

    expect(router.url).toBe('/turniri?status=u-toku');
    expect(cardNames(element)).toEqual(['Sarajevo Open']);
  });

  it('applies game and search filters from the query params', async () => {
    const { element } = await render('/turniri?igra=LOL&q=zimski');

    expect(cardNames(element)).toEqual(['Zimski Kup']);
  });

  it('updates the search query param while typing', async () => {
    const { harness, element } = await render();
    const router = TestBed.inject(Router);
    const input = element.querySelector<HTMLInputElement>('.search-input')!;

    input.value = 'balkan';
    input.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();

    expect(router.url).toBe('/turniri?q=balkan');
    expect(cardNames(element)).toEqual(['Balkan Kup']);
  });

  it('does not show the pending section to a player', async () => {
    const { element } = await render();

    expect(element.querySelector('app-pending-tournaments')).toBeNull();
    http.expectNone('/api/tournaments/pending');
  });

  it('shows pending tournaments to an admin and refreshes after approving', async () => {
    const { harness, element } = await render('/turniri', ['ADMIN'], [
      tournament({ id: 9, name: 'Novi Kup', status: 'PENDING' }),
    ]);

    const row = element.querySelector('[data-pending-id="9"]')!;
    expect(element.querySelector('app-pending-tournaments h2')!.textContent).toContain('Čeka odobrenje');
    expect(row.textContent).toContain('Novi Kup');

    row.querySelector<HTMLButtonElement>('.approve')!.click();
    http.expectOne({ method: 'POST', url: '/api/tournaments/9/approve' }).flush(tournament({ id: 9 }));
    await settle();

    http.expectOne('/api/tournaments/pending').flush([]);
    http.expectOne('/api/tournaments').flush([...TOURNAMENTS]);
    await settle();
    for (const t of TOURNAMENTS) {
      http.expectOne(`/api/tournaments/${t.id}/registrations`).flush([]);
    }
    await harness.fixture.whenStable();

    expect(element.querySelector('[data-pending-id="9"]')).toBeNull();
  });

  it('asks for confirmation in place before rejecting', async () => {
    const { harness, element } = await render('/turniri', ['ADMIN'], [tournament({ id: 9, status: 'PENDING' })]);

    element.querySelector<HTMLButtonElement>('[data-pending-id="9"] .trigger')!.click();
    await harness.fixture.whenStable();
    http.expectNone('/api/tournaments/9/reject');

    element.querySelector<HTMLButtonElement>('[data-pending-id="9"] .confirm')!.click();
    http.expectOne({ method: 'POST', url: '/api/tournaments/9/reject' }).flush(tournament({ id: 9 }));
    await settle();
    http.expectOne('/api/tournaments/pending').flush([]);
    http.expectOne('/api/tournaments').flush([]);
    await harness.fixture.whenStable();
  });

  it('shows the empty state with a call to action when there are no tournaments', async () => {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'turniri', component: Turniri }]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/turniri');
    await settle();
    http.expectOne('/api/games').flush(GAMES);
    http.expectOne('/api/tournaments').flush([]);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('app-empty-state')!.textContent).toContain('Još nema turnira.');
    expect(element.querySelector('app-empty-state a')!.textContent).toContain('Novi turnir');
  });

  it('shows an error state with retry', async () => {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'turniri', component: Turniri }]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create('/turniri');
    await settle();
    http.expectOne('/api/games').flush(GAMES);
    http.expectOne('/api/tournaments').flush(null, { status: 0, statusText: 'Unknown Error' });
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('app-error-state')!.textContent).toContain('Server nije dostupan');

    element.querySelector<HTMLButtonElement>('app-error-state button')!.click();
    await settle();
    http.expectOne('/api/tournaments').flush([]);
    await harness.fixture.whenStable();

    expect(element.querySelector('app-error-state')).toBeNull();
  });
});
