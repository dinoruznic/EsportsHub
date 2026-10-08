import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Listing, MyOffer, Team } from '../../core/api/models';
import { storeSession, TEST_USER } from '../../testing/fake-session';
import { listingOf, myOfferOf, offerOf, teamOf } from '../../testing/market-data';
import { PROFILE_GAMES, account } from '../../testing/profile-data';
import Market from './market';

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

const LISTINGS: Listing[] = [
  listingOf({ id: 5, ownerUsername: 'igrac', offerCount: 2 }),
  listingOf({
    id: 6,
    gameAccountId: 60,
    ownerUsername: 'drugi',
    gameCode: 'CS2',
    inGameName: 'awper',
    rank: null,
    rating: 18450,
    position: 'AWP',
    createdAt: '2026-10-04T10:00:00Z',
  }),
];

describe('Market', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(
    username: string,
    teams: Team[],
    myOffers: MyOffer[] = [],
    url = '/market',
  ): Promise<void> {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username, roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'market', component: Market }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    await settle();
    http.expectOne('/api/market/listings').flush(LISTINGS);
    http.expectOne('/api/games').flush(PROFILE_GAMES);
    http.expectOne('/api/teams').flush(teams);
    await settle();
    http
      .expectOne('/api/players/drugi')
      .flush({ username: 'drugi', displayName: 'Drugi Igrač', teams: [] });
    http.expectOne('/api/players/drugi/game-accounts').flush([account({ id: 60, region: 'EU' })]);
    http
      .expectOne('/api/players/igrac')
      .flush({ username: 'igrac', displayName: 'Igrač Jedan', teams: [] });
    http.expectOne('/api/players/igrac/game-accounts').flush([account({ id: 50, region: 'EUW' })]);
    if (teams.some((t) => t.captainUsername === username)) {
      http.expectOne('/api/me/offers').flush(myOffers);
    }
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  }

  async function flushOwners(): Promise<void> {
    await settle();
    for (const request of http.match((r) => r.url.startsWith('/api/players/'))) {
      request.flush(
        request.request.url.endsWith('/game-accounts') ? [] : { username: 'x', teams: [] },
      );
    }
    await settle();
  }

  function text(selector: string): string {
    return element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  async function open(listingId: number): Promise<void> {
    element.querySelector<HTMLButtonElement>(`[data-listing-id="${listingId}"]`)!.click();
    await settle();
  }

  async function type(id: string, value: string): Promise<void> {
    const control = element.querySelector<HTMLInputElement>(`#${id}`)!;
    control.value = value;
    control.dispatchEvent(new Event('input'));
    control.dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
  }

  it('renders listing cards from the backend', async () => {
    await render('neko', []);
    const cards = Array.from(element.querySelectorAll('app-listing-card'));
    const lol = element.querySelector('[data-listing-id="5"]')!;

    expect(cards.length).toBe(2);
    expect(lol.querySelector('.ign-name')!.textContent).toBe('zvijezda');
    expect(lol.querySelector('.ign-tag')!.textContent).toBe('#EUW');
    expect(lol.querySelector('.rank')!.textContent).toBe('Diamond');
    expect(lol.querySelector('.owner')!.textContent!.trim()).toBe('Igrač Jedan');
    expect(lol.querySelector('.region')!.textContent).toBe('EUW');
    expect(lol.querySelector('.offers')!.textContent).toBe('2 ponude');
    expect(text('[data-listing-id="6"] .rating')).toBe('18.450');
    expect(element.querySelector('[data-tab="ponude"]')).toBeNull();
  });

  it('marks own listings and shows the offers to the owner with accept and reject', async () => {
    await render('igrac', []);

    expect(text('[data-listing-id="5"] .own-badge')).toBe('Tvoj oglas');
    expect(text('[data-tab="moji"] .badge')).toBe('2');

    await open(5);
    http.expectOne('/api/market/listings/5/offers').flush([
      offerOf({ id: 1 }),
      offerOf({
        id: 2,
        fromTeamId: 11,
        fromTeamName: 'Drina Wolves',
        amount: 900,
        message: null,
      }),
    ]);
    await harness.fixture.whenStable();

    expect(element.querySelector('app-offer-form')).toBeNull();
    expect(element.querySelectorAll('app-drawer .offer').length).toBe(2);

    const first = element.querySelector('app-drawer [data-offer-id="1"]')!;
    first.querySelector<HTMLButtonElement>('.accept .trigger')!.click();
    await harness.fixture.whenStable();
    expect(first.querySelector('.accept .question')!.textContent).toContain(
      'ostale ponude se odbijaju',
    );
    http.expectNone({ method: 'POST', url: '/api/market/offers/1/accept' });

    first.querySelector<HTMLButtonElement>('.accept .confirm')!.click();
    http.expectOne({ method: 'POST', url: '/api/market/offers/1/accept' }).flush({
      id: 9,
      gameAccountId: 50,
      inGameName: 'zvijezda#EUW',
      teamId: 10,
      teamName: 'Sarajevo Lions',
      salary: 1500,
      startDate: '2026-10-08',
      endDate: null,
      status: 'ACTIVE',
      createdAt: '2026-10-08T10:00:00Z',
    });
    await settle();
    http.expectOne('/api/market/listings').flush([LISTINGS[1]]);
    await flushOwners();
    await harness.fixture.whenStable();

    expect(text('app-drawer .success-title')).toBe('Ugovor je potpisan');
    expect(text('app-drawer .success-text')).toContain('1.500 KM');
    expect(element.querySelector('app-drawer .success a')!.getAttribute('href')).toBe('/timovi/10');
  });

  it('lets the owner reject an offer', async () => {
    await render('igrac', []);
    await open(5);
    http.expectOne('/api/market/listings/5/offers').flush([offerOf({ id: 1 })]);
    await harness.fixture.whenStable();

    element.querySelector<HTMLButtonElement>('app-drawer .reject')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/market/offers/1/reject' })
      .flush(offerOf({ status: 'REJECTED' }));
    await settle();
    http.expectOne('/api/market/listings/5/offers').flush([offerOf({ id: 1, status: 'REJECTED' })]);
    http.expectOne('/api/market/listings').flush(LISTINGS);
    await flushOwners();
    await harness.fixture.whenStable();

    expect(text('app-drawer app-offer-status')).toBe('Odbijena');
    expect(element.querySelector('app-drawer .reject')).toBeNull();
  });

  it('shows the offer form only to a captain of a team from the same game', async () => {
    await render('kapiten', [teamOf({ id: 10, captainUsername: 'kapiten' })]);

    await open(6);
    expect(element.querySelector('app-offer-form')).toBeNull();
    expect(text('app-drawer .read-only')).toContain('samo kapiten tima iz iste igre');
    element.querySelector<HTMLButtonElement>('app-drawer .close')!.click();
    await harness.fixture.whenStable();

    await open(5);
    expect(element.querySelector('app-offer-form')).not.toBeNull();
    expect(element.querySelector<HTMLSelectElement>('#offer-team')!.value).toBe('10');
  });

  it('shows a read-only summary to a player without a team', async () => {
    await render('neko', []);
    await open(5);

    expect(element.querySelector('app-offer-form')).toBeNull();
    expect(element.querySelector('app-listing-offers')).toBeNull();
    expect(text('app-drawer .read-only')).toContain('samo kapiten');
  });

  it('requires an amount above zero and sends the offer', async () => {
    await render('kapiten', [teamOf({ id: 10, captainUsername: 'kapiten' })]);
    await open(5);

    element.querySelector<HTMLButtonElement>('app-offer-form .submit')!.click();
    await harness.fixture.whenStable();
    expect(text('#offer-amount-error')).toBe('Obavezno polje.');

    await type('offer-amount', '0');
    expect(text('#offer-amount-error')).toBe('Iznos mora biti cijeli broj veći od 0.');
    element.querySelector<HTMLButtonElement>('app-offer-form .submit')!.click();
    http.expectNone({ method: 'POST', url: '/api/market/listings/5/offers' });

    await type('offer-amount', '1500');
    expect(text('app-offer-form .field-hint.num')).toBe('1.500 KM');
    const message = element.querySelector<HTMLTextAreaElement>('#offer-message')!;
    message.value = 'Treba nam mid.';
    message.dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('app-offer-form .submit')!.click();

    const request = http.expectOne({ method: 'POST', url: '/api/market/listings/5/offers' });
    expect(request.request.body).toEqual({ teamId: 10, amount: 1500, message: 'Treba nam mid.' });
    request.flush(offerOf());
    await settle();
    http.expectOne('/api/me/offers').flush([myOfferOf()]);
    http.expectOne('/api/market/listings').flush(LISTINGS);
    await flushOwners();
    await harness.fixture.whenStable();

    expect(element.querySelector('app-offer-form')).toBeNull();
    expect(text('app-drawer .my-offer app-offer-status')).toBe('Na čekanju');
    expect(element.querySelector('app-drawer .my-offer .withdraw')).not.toBeNull();
  });

  it('lists my offers with status chips and withdraws a pending one', async () => {
    await render(
      'kapiten',
      [teamOf({ id: 10, captainUsername: 'kapiten' })],
      [
        myOfferOf({ id: 1, status: 'PENDING' }),
        myOfferOf({ id: 2, status: 'ACCEPTED', inGameName: 'drugi#EUW' }),
        myOfferOf({ id: 3, status: 'REJECTED' }),
        myOfferOf({ id: 4, status: 'WITHDRAWN' }),
      ],
      '/market?tab=ponude',
    );
    const statuses = Array.from(element.querySelectorAll('.sent-row app-offer-status')).map(
      (s) => s.getAttribute('data-status') + ':' + s.textContent!.trim(),
    );

    expect(element.querySelector('[data-tab="ponude"]')!.classList).toContain('active');
    expect(statuses).toEqual([
      'PENDING:Na čekanju',
      'ACCEPTED:Prihvaćena',
      'REJECTED:Odbijena',
      'WITHDRAWN:Povučena',
    ]);
    expect(element.querySelectorAll('.sent-row .withdraw').length).toBe(1);

    element.querySelector<HTMLButtonElement>('[data-offer-id="1"] .withdraw')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/market/offers/1/withdraw' })
      .flush(offerOf({ status: 'WITHDRAWN' }));
    await settle();
    http.expectOne('/api/me/offers').flush([myOfferOf({ id: 1, status: 'WITHDRAWN' })]);
    http.expectOne('/api/market/listings').flush(LISTINGS);
    await flushOwners();
    await harness.fixture.whenStable();

    expect(element.querySelectorAll('.sent-row .withdraw').length).toBe(0);
  });
});
