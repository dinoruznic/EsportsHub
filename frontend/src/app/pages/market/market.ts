import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MarketApi } from '../../core/api/market-api';
import { Contract, Listing, MyOffer } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { TeamsApi } from '../../core/api/teams-api';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { Drawer } from '../../shared/drawer/drawer';
import { formatDate, formatKm } from '../../shared/format';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { ListingCard } from './listing-card';
import { ListingDetail } from './listing-detail';
import { ListingOffers } from './listing-offers';
import { OfferForm } from './offer-form';
import { OfferStatus } from './offer-status';

export type MarketTab = 'svi' | 'moji' | 'ponude';

interface OwnerInfo {
  displayName: string | null;
  regions: Record<number, string | null>;
}

@Component({
  selector: 'app-market',
  imports: [
    RouterLink,
    ConfirmInline,
    Drawer,
    EmptyState,
    ErrorState,
    GameBadge,
    Skeleton,
    TeamHex,
    ListingCard,
    ListingDetail,
    ListingOffers,
    OfferForm,
    OfferStatus,
  ],
  templateUrl: './market.html',
  styleUrl: './market.scss',
})
export default class Market {
  private readonly marketApi = inject(MarketApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly playersApi = inject(PlayersApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly game = computed(() => this.query().get('igra') ?? '');
  protected readonly position = computed(() => this.query().get('pozicija') ?? '');
  protected readonly search = computed(() => this.query().get('q') ?? '');
  protected readonly tab = computed<MarketTab>(() => {
    const tab = this.query().get('tab');
    if (tab === 'moji') {
      return 'moji';
    }
    return tab === 'ponude' && this.captainTeams().length > 0 ? 'ponude' : 'svi';
  });

  protected readonly me = computed(() => this.auth.currentUser()?.username ?? null);
  protected readonly listings = rxResource({ stream: () => this.marketApi.openListings() });
  protected readonly games = rxResource({ stream: () => this.gamesApi.list() });
  protected readonly gameNames = computed<Record<string, string>>(() =>
    Object.fromEntries(
      (this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name]),
    ),
  );
  private readonly selectedGame = computed(
    () =>
      (this.games.hasValue() ? this.games.value() : []).find((g) => g.code === this.game()) ?? null,
  );
  protected readonly positions = rxResource({
    params: () => this.selectedGame()?.id,
    stream: ({ params }) => this.gamesApi.positions(params).pipe(catchError(() => of([]))),
  });

  private readonly owners = computed(() =>
    [
      ...new Set(
        (this.listings.hasValue() ? this.listings.value() : []).map((l) => l.ownerUsername),
      ),
    ].sort(),
  );
  private readonly ownerInfo = rxResource({
    params: () => (this.owners().length > 0 ? this.owners() : undefined),
    stream: ({ params }) =>
      forkJoin(
        params.map((username) =>
          forkJoin({
            profile: this.playersApi.get(username).pipe(catchError(() => of(null))),
            accounts: this.playersApi.gameAccounts(username).pipe(catchError(() => of([]))),
          }).pipe(
            map(
              ({ profile, accounts }) =>
                [
                  username,
                  {
                    displayName: profile?.displayName ?? null,
                    regions: Object.fromEntries(accounts.map((a) => [a.id, a.region])),
                  },
                ] as const,
            ),
          ),
        ),
      ).pipe(map((entries) => Object.fromEntries(entries) as Record<string, OwnerInfo>)),
  });

  private readonly teams = rxResource({
    stream: () => this.teamsApi.list().pipe(catchError(() => of([]))),
  });
  protected readonly captainTeams = computed(() =>
    (this.teams.hasValue() ? this.teams.value() : []).filter(
      (t) => t.captainUsername === this.me(),
    ),
  );
  protected readonly myOffers = rxResource({
    params: () => (this.captainTeams().length > 0 ? this.me() : undefined),
    stream: () => this.marketApi.myOffers().pipe(catchError(() => of([] as MyOffer[]))),
  });
  protected readonly sentOffers = computed(() =>
    this.myOffers.hasValue() ? this.myOffers.value() : [],
  );
  protected readonly myListings = computed(() =>
    (this.listings.hasValue() ? this.listings.value() : []).filter(
      (l) => l.ownerUsername === this.me(),
    ),
  );
  protected readonly receivedOffers = computed(() =>
    this.myListings().reduce((sum, listing) => sum + (listing.offerCount ?? 0), 0),
  );

  protected readonly visible = computed(() => {
    const all = this.listings.hasValue() ? this.listings.value() : [];
    const game = this.game();
    const position = this.position();
    const search = this.search().trim().toLocaleLowerCase('bs');
    return [...all]
      .filter((l) => !game || l.gameCode === game)
      .filter((l) => !position || l.position === position)
      .filter((l) => !search || l.inGameName.toLocaleLowerCase('bs').includes(search))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
  protected readonly filtered = computed(() => !!(this.game() || this.position() || this.search()));

  protected readonly selectedId = signal<number | null>(null);
  private readonly selectedSnapshot = signal<Listing | null>(null);
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    const live = (this.listings.hasValue() ? this.listings.value() : []).find((l) => l.id === id);
    return live ?? (this.selectedSnapshot()?.id === id ? this.selectedSnapshot() : null);
  });
  protected readonly eligibleTeams = computed(() => {
    const listing = this.selected();
    return listing ? this.captainTeams().filter((t) => t.gameCode === listing.gameCode) : [];
  });
  protected readonly myOfferForSelected = computed(() => {
    const listing = this.selected();
    if (!listing) {
      return null;
    }
    const offers = this.sentOffers().filter((o) => o.listingId === listing.id);
    return offers.find((o) => o.status === 'PENDING') ?? offers[0] ?? null;
  });
  protected readonly withdrawingId = signal<number | null>(null);
  protected readonly cancellingId = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly lastContract = signal<Contract | null>(null);

  protected loadError(): string {
    return toApiError(this.listings.error()).message;
  }

  protected ownerName(listing: Listing): string | null {
    return this.ownerInfo.hasValue()
      ? (this.ownerInfo.value()[listing.ownerUsername]?.displayName ?? null)
      : null;
  }

  protected region(listing: Listing): string | null {
    return this.ownerInfo.hasValue()
      ? (this.ownerInfo.value()[listing.ownerUsername]?.regions[listing.gameAccountId] ?? null)
      : null;
  }

  protected isOwn(listing: Listing): boolean {
    return listing.ownerUsername === this.me();
  }

  protected setFilter(name: 'igra' | 'pozicija' | 'q', value: string): void {
    const extra = name === 'igra' ? { pozicija: null } : {};
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [name]: value || null, ...extra },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { igra: null, pozicija: null, q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected openListing(listing: Listing): void {
    this.actionError.set(null);
    this.selectedSnapshot.set(listing);
    this.selectedId.set(listing.id);
  }

  protected setTab(tab: MarketTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'svi' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected amount(value: number | null): string {
    return value === null ? '—' : formatKm(value);
  }

  protected date(value: string | null): string {
    return value ? formatDate(value) : '—';
  }

  protected onOfferSent(): void {
    this.myOffers.reload();
    this.listings.reload();
  }

  protected onAccepted(contract: Contract): void {
    this.lastContract.set(contract);
    this.listings.reload();
  }

  protected onOffersChanged(): void {
    this.listings.reload();
  }

  protected withdraw(offer: MyOffer): void {
    this.withdrawingId.set(offer.id);
    this.actionError.set(null);
    this.marketApi.withdrawOffer(offer.id).subscribe({
      next: () => {
        this.withdrawingId.set(null);
        this.myOffers.reload();
        this.listings.reload();
      },
      error: (error: unknown) => {
        this.withdrawingId.set(null);
        this.actionError.set(toApiError(error).message);
      },
    });
  }

  protected cancelListing(listing: Listing): void {
    this.cancellingId.set(listing.id);
    this.actionError.set(null);
    this.marketApi.cancelListing(listing.id).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.listings.reload();
      },
      error: (error: unknown) => {
        this.cancellingId.set(null);
        this.actionError.set(toApiError(error).message);
      },
    });
  }

  protected closeListing(): void {
    this.selectedId.set(null);
  }
}
