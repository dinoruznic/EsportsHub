import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MarketApi } from '../../core/api/market-api';
import { Listing } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { AuthService } from '../../core/auth/auth.service';
import { Drawer } from '../../shared/drawer/drawer';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { ListingCard } from './listing-card';
import { ListingDetail } from './listing-detail';

interface OwnerInfo {
  displayName: string | null;
  regions: Record<number, string | null>;
}

@Component({
  selector: 'app-market',
  imports: [Drawer, EmptyState, ErrorState, Skeleton, ListingCard, ListingDetail],
  templateUrl: './market.html',
  styleUrl: './market.scss',
})
export default class Market {
  private readonly marketApi = inject(MarketApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly playersApi = inject(PlayersApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly game = computed(() => this.query().get('igra') ?? '');
  protected readonly position = computed(() => this.query().get('pozicija') ?? '');
  protected readonly search = computed(() => this.query().get('q') ?? '');

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
  protected readonly selected = computed(() => {
    const id = this.selectedId();
    return (this.listings.hasValue() ? this.listings.value() : []).find((l) => l.id === id) ?? null;
  });

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
    this.selectedId.set(listing.id);
  }

  protected closeListing(): void {
    this.selectedId.set(null);
  }
}
