import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { GameAccount } from '../../core/api/models';
import { storeSession, TEST_USER } from '../../testing/fake-session';
import {
  CS2_OPTIONS,
  LOL_OPTIONS,
  ME,
  PROFILE_GAMES,
  account,
  cs2Account,
} from '../../testing/profile-data';
import Profil from './profil';

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

describe('Profil', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(accounts: GameAccount[], listings: object[] = []): Promise<void> {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username: 'yueen', roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'profil', component: Profil }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/profil');
    await settle();
    http.expectOne('/api/me').flush(ME);
    await settle();
    http.expectOne('/api/players/yueen').flush({
      username: 'yueen',
      displayName: 'Dino Ruznic',
      roles: ['PLAYER'],
      createdAt: ME.createdAt,
      teams: [{ id: 4, name: 'Bosna Bisons', tag: 'BB', gameCode: 'LOL', captain: true }],
    });
    http.expectOne('/api/me/game-accounts').flush(accounts);
    http.expectOne('/api/games').flush(PROFILE_GAMES);
    await settle();
    if (accounts.some((a) => a.marketStatus === 'AVAILABLE')) {
      http.expectOne('/api/market/listings').flush(listings);
      await settle();
    }
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  }

  function text(selector: string): string {
    return element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  async function select(id: string, value: string): Promise<void> {
    const control = element.querySelector<HTMLSelectElement>(`#${id}`)!;
    control.value = value;
    control.dispatchEvent(new Event('change'));
    await settle();
  }

  async function type(id: string, value: string): Promise<void> {
    const control = element.querySelector<HTMLInputElement>(`#${id}`)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  function flushOptions(gameId: number, options: typeof LOL_OPTIONS): void {
    for (const kind of ['regions', 'positions', 'ranks']) {
      http.expectOne(`/api/games/${gameId}/${kind}`).flush(options[kind]);
    }
  }

  it('renders the header from the me endpoint with team chips', async () => {
    await render([]);

    expect(text('app-profile-header h1')).toBe('Dino Ruznic');
    expect(text('.handle')).toBe('@yueen');
    expect(text('app-profile-header text')).toBe('DR');
    expect(text('.role')).toBe('PLAYER');
    expect(text('.team .tag')).toBe('BB');
    expect(text('.team .team-name')).toBe('Bosna Bisons');
    expect(text('.team .captain')).toBe('C');
    expect(element.querySelector('.team')!.getAttribute('href')).toBe('/timovi/4');
    expect(text('.since-label')).toBe('Član od');
    expect(text('.since span:last-child')).toBe('1. okt 2026.');
    expect(text('app-empty-state')).toContain('Dodaj svoj prvi nalog');
  });

  it('edits the display name and updates the header', async () => {
    await render([]);

    element.querySelector<HTMLButtonElement>('.pencil')!.click();
    await harness.fixture.whenStable();
    await type('display-name-input', 'Novo Ime');
    element.querySelector<HTMLButtonElement>('app-profile-header .save')!.click();

    const request = http.expectOne({ method: 'PUT', url: '/api/me' });
    expect(request.request.body).toEqual({ displayName: 'Novo Ime' });
    request.flush({ ...ME, displayName: 'Novo Ime' });
    await settle();
    http.expectOne('/api/players/yueen').flush({ ...ME, teams: [] });
    await harness.fixture.whenStable();

    expect(text('app-profile-header h1')).toBe('Novo Ime');
    expect(element.querySelector('app-profile-header form')).toBeNull();
  });

  it('rejects a display name longer than 60 characters', async () => {
    await render([]);

    element.querySelector<HTMLButtonElement>('.pencil')!.click();
    await harness.fixture.whenStable();
    await type('display-name-input', 'x'.repeat(61));
    element.querySelector<HTMLButtonElement>('app-profile-header .save')!.click();
    await harness.fixture.whenStable();

    http.expectNone({ method: 'PUT', url: '/api/me' });
    expect(text('#display-name-error')).toBe('Ime za prikaz može imati najviše 60 znakova.');
  });

  it('adapts the add form to the game and shows required errors only after submit', async () => {
    await render([]);

    element.querySelector<HTMLButtonElement>('.add-first')!.click();
    await harness.fixture.whenStable();
    expect(element.querySelectorAll('app-account-form .field-error').length).toBe(0);

    element.querySelector<HTMLButtonElement>('app-account-form .submit')!.click();
    await harness.fixture.whenStable();
    expect(
      Array.from(element.querySelectorAll('app-account-form .field-error')).map((e) =>
        e.textContent!.trim(),
      ),
    ).toEqual(['Izaberi igru.', 'Obavezno polje.']);
    http.expectNone('/api/me/game-accounts');

    await select('account-game', '1');
    flushOptions(1, LOL_OPTIONS);
    await harness.fixture.whenStable();
    expect(element.querySelector('#account-rank')).not.toBeNull();
    expect(element.querySelector('#account-rating')).toBeNull();
    expect(
      Array.from(element.querySelectorAll<HTMLOptionElement>('#account-rank option')).map(
        (o) => o.text,
      ),
    ).toEqual(['Bez ranga', 'Emerald', 'Diamond']);

    await select('account-game', '2');
    flushOptions(2, CS2_OPTIONS);
    await harness.fixture.whenStable();
    expect(element.querySelector('#account-rank')).toBeNull();
    expect(element.querySelector('#account-rating')).not.toBeNull();

    await select('account-game', '5');
    http.expectOne('/api/games/5/regions').flush([]);
    http.expectOne('/api/games/5/positions').flush([]);
    http.expectOne('/api/games/5/ranks').flush([]);
    await harness.fixture.whenStable();
    expect(element.querySelector('#account-rank')).toBeNull();
    expect(element.querySelector('#account-rating')).toBeNull();
  });

  it('creates a TIER account with the selected ids', async () => {
    await render([]);

    element.querySelector<HTMLButtonElement>('.add-first')!.click();
    await harness.fixture.whenStable();
    await select('account-game', '1');
    flushOptions(1, LOL_OPTIONS);
    await harness.fixture.whenStable();
    await type('account-ign', 'yueen8#EUW');
    await select('account-region', '1');
    await select('account-position', '3');
    await select('account-rank', '7');
    element.querySelector<HTMLButtonElement>('app-account-form .submit')!.click();

    const request = http.expectOne({ method: 'POST', url: '/api/me/game-accounts' });
    expect(request.request.body).toEqual({
      gameId: 1,
      inGameName: 'yueen8#EUW',
      regionId: 1,
      positionId: 3,
      rankId: 7,
      rating: null,
    });
    request.flush(account());
    await harness.fixture.whenStable();

    expect(element.querySelector('app-account-form')).toBeNull();
    expect(text('app-account-card .rank-name')).toBe('Diamond');
  });

  it('rejects a negative rating for NUMERIC games', async () => {
    await render([]);

    element.querySelector<HTMLButtonElement>('.add-first')!.click();
    await harness.fixture.whenStable();
    await select('account-game', '2');
    flushOptions(2, CS2_OPTIONS);
    await harness.fixture.whenStable();
    await type('account-rating', '-5');

    expect(text('#account-rating-error')).toBe('Unesi cijeli broj, 0 ili veći.');
  });

  it('prefills the edit form by mapping labels back to ids', async () => {
    await render([account()]);

    element.querySelector<HTMLButtonElement>('.menu-button')!.click();
    await harness.fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.menu .edit')!.click();
    await settle();
    flushOptions(1, LOL_OPTIONS);
    await harness.fixture.whenStable();

    const value = (id: string) =>
      element.querySelector<HTMLSelectElement | HTMLInputElement>(`#${id}`)!;
    expect(value('account-game').disabled).toBe(true);
    expect(value('account-ign').value).toBe('yueen8#EUW');
    expect(value('account-region').value).toBe('1');
    expect(value('account-position').value).toBe('3');
    expect(value('account-rank').value).toBe('7');

    element.querySelector<HTMLButtonElement>('app-account-form .submit')!.click();
    const request = http.expectOne({ method: 'PUT', url: '/api/me/game-accounts/1' });
    expect(request.request.body).toEqual({
      inGameName: 'yueen8#EUW',
      regionId: 1,
      positionId: 3,
      rankId: 7,
      rating: null,
      marketStatus: 'INACTIVE',
    });
    request.flush(account());
    await harness.fixture.whenStable();
  });

  it('turns the transfer switch on and off through the market listings', async () => {
    await render([account()]);
    const toggle = () => element.querySelector<HTMLButtonElement>('[role="switch"]')!;

    toggle().click();
    await harness.fixture.whenStable();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    const create = http.expectOne({ method: 'POST', url: '/api/market/listings' });
    expect(create.request.body).toEqual({ gameAccountId: 1 });
    create.flush({ id: 30, gameAccountId: 1, status: 'OPEN' });
    await harness.fixture.whenStable();
    expect(text('.listed .on')).toBe('Na transfer listi');

    toggle().click();
    await harness.fixture.whenStable();
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    http.expectOne({ method: 'POST', url: '/api/market/listings/30/cancel' }).flush({ id: 30 });
    await harness.fixture.whenStable();
    expect(element.querySelector('.listed')).toBeNull();
  });

  it('finds the open listing and shows the offer count for an available account', async () => {
    await render(
      [cs2Account({ marketStatus: 'AVAILABLE' })],
      [{ id: 44, gameAccountId: 2, status: 'OPEN' }],
    );
    http.expectOne('/api/market/listings/44/offers').flush([
      { id: 1, status: 'PENDING' },
      { id: 2, status: 'PENDING' },
      { id: 3, status: 'REJECTED' },
    ]);
    await harness.fixture.whenStable();

    expect(text('.listed')).toContain('2 ponude');
  });

  it('rolls the switch back with a Bosnian message when the listing fails', async () => {
    await render([account()]);

    element.querySelector<HTMLButtonElement>('[role="switch"]')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/market/listings' })
      .flush({ message: 'vec je na trzistu' }, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();

    expect(element.querySelector('[role="switch"]')!.getAttribute('aria-checked')).toBe('false');
    expect(text('app-account-card .error')).toBe(
      'Stavljanje na transfer listu nije uspjelo. Nalog je već na transfer listi.',
    );
  });

  it('deletes an account after confirming in place', async () => {
    await render([account(), cs2Account()]);

    element.querySelectorAll<HTMLButtonElement>('.menu-button')[1].click();
    await harness.fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.menu .delete .trigger')!.click();
    await harness.fixture.whenStable();
    http.expectNone({ method: 'DELETE' });
    element.querySelector<HTMLButtonElement>('.menu .delete .confirm')!.click();
    http.expectOne({ method: 'DELETE', url: '/api/me/game-accounts/2' }).flush(null);
    await harness.fixture.whenStable();

    expect(element.querySelectorAll('app-account-card').length).toBe(1);
  });
});
