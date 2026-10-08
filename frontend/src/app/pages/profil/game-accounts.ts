import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap, throwError } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GameAccountsApi } from '../../core/api/game-accounts-api';
import { GamesApi } from '../../core/api/games-api';
import { MarketApi } from '../../core/api/market-api';
import { Game, GameAccount, MarketStatus } from '../../core/api/models';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { AccountCard, TransferState } from './account-card';
import { AccountForm } from './account-form';

type FormMode = { kind: 'add' } | { kind: 'edit'; account: GameAccount } | null;

function byId(accounts: GameAccount[]): GameAccount[] {
  return [...accounts].sort((a, b) => a.id - b.id);
}

const DELETE_BLOCKED = 'Nalog se ne može obrisati jer ima ugovor sa timom.';

@Component({
  selector: 'app-game-accounts',
  imports: [AccountCard, AccountForm, EmptyState, ErrorState, Skeleton],
  templateUrl: './game-accounts.html',
  styleUrl: './game-accounts.scss',
})
export class GameAccounts {
  private readonly accountsApi = inject(GameAccountsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly marketApi = inject(MarketApi);

  protected readonly accounts = signal<GameAccount[] | null>(null);
  protected readonly games = signal<Game[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly mode = signal<FormMode>(null);
  protected readonly transfer = signal<Record<number, TransferState>>({});
  private readonly listingIds = signal<Record<number, number>>({});
  protected readonly deleting = signal<number | null>(null);
  protected readonly deleteErrors = signal<Record<number, string>>({});

  protected readonly usedGameCodes = computed(() => (this.accounts() ?? []).map((a) => a.gameCode));
  protected readonly allGamesUsed = computed(
    () => this.games().length > 0 && this.usedGameCodes().length >= this.games().length,
  );
  protected readonly editing = computed(() => {
    const mode = this.mode();
    return mode?.kind === 'edit' ? mode.account : null;
  });

  constructor() {
    this.load();
  }

  protected rankTypeOf(account: GameAccount): string {
    return this.games().find((game) => game.code === account.gameCode)?.rankType ?? 'NONE';
  }

  protected load(): void {
    this.loadError.set(null);
    forkJoin({ accounts: this.accountsApi.listMine(), games: this.gamesApi.list() }).subscribe({
      next: ({ accounts, games }) => {
        this.games.set(games);
        this.accounts.set(byId(accounts));
        this.loadListings(accounts);
      },
      error: (error: unknown) => this.loadError.set(toApiError(error).message),
    });
  }

  protected openAdd(): void {
    if (!this.allGamesUsed()) {
      this.mode.set({ kind: 'add' });
    }
  }

  protected openEdit(account: GameAccount): void {
    this.mode.set({ kind: 'edit', account });
  }

  protected closeForm(): void {
    this.mode.set(null);
  }

  protected onSaved(saved: GameAccount): void {
    this.accounts.update((list) => {
      const current = list ?? [];
      return byId(
        current.some((a) => a.id === saved.id)
          ? current.map((a) => (a.id === saved.id ? saved : a))
          : [...current, saved],
      );
    });
    this.mode.set(null);
  }

  protected remove(account: GameAccount): void {
    this.deleting.set(account.id);
    this.setDeleteError(account.id, null);
    this.accountsApi.delete(account.id).subscribe({
      next: () => {
        this.deleting.set(null);
        this.accounts.update((list) => (list ?? []).filter((a) => a.id !== account.id));
      },
      error: (error: unknown) => {
        this.deleting.set(null);
        const blocked = error instanceof HttpErrorResponse && error.status >= 500;
        this.setDeleteError(account.id, blocked ? DELETE_BLOCKED : toApiError(error).message);
      },
    });
  }

  protected toggle(account: GameAccount, on: boolean): void {
    const previous = account.marketStatus;
    this.setStatus(account.id, on ? 'AVAILABLE' : 'INACTIVE');
    this.setTransfer(account.id, { busy: true, error: null });

    const request: Observable<number | null> = on
      ? this.marketApi.createListing(account.id).pipe(map((listing) => listing.id))
      : this.listingFor(account.id).pipe(
          switchMap((listingId) => this.marketApi.cancelListing(listingId)),
          map(() => null),
        );

    request.subscribe({
      next: (listingId) => {
        this.listingIds.update((ids) => {
          const next = { ...ids };
          if (listingId === null) {
            delete next[account.id];
          } else {
            next[account.id] = listingId;
          }
          return next;
        });
        this.setTransfer(account.id, { busy: false, error: null, offers: on ? 0 : null });
      },
      error: (error: unknown) => {
        this.setStatus(account.id, previous);
        this.setTransfer(account.id, {
          busy: false,
          error: on
            ? `Stavljanje na transfer listu nije uspjelo. ${toApiError(error).message}`
            : `Skidanje sa transfer liste nije uspjelo. ${toApiError(error).message}`,
        });
      },
    });
  }

  private listingFor(accountId: number) {
    const known = this.listingIds()[accountId];
    if (known) {
      return of(known);
    }
    return this.marketApi
      .openListingFor(accountId)
      .pipe(
        switchMap((listing) =>
          listing
            ? of(listing.id)
            : throwError(() => new Error('Oglas za ovaj nalog nije pronađen.')),
        ),
      );
  }

  private loadListings(accounts: GameAccount[]): void {
    if (!accounts.some((a) => a.marketStatus === 'AVAILABLE')) {
      return;
    }
    this.marketApi
      .openListings()
      .pipe(catchError(() => of([])))
      .subscribe((listings) => {
        const mine = new Set(accounts.map((a) => a.id));
        const ids: Record<number, number> = {};
        for (const listing of listings) {
          if (mine.has(listing.gameAccountId)) {
            ids[listing.gameAccountId] = listing.id;
          }
        }
        this.listingIds.set(ids);
        for (const [accountId, listingId] of Object.entries(ids)) {
          this.marketApi
            .offers(listingId)
            .pipe(catchError(() => of([])))
            .subscribe((offers) =>
              this.setTransfer(Number(accountId), {
                offers: offers.filter((offer) => offer.status === 'PENDING').length,
              }),
            );
        }
      });
  }

  private setStatus(accountId: number, status: MarketStatus): void {
    this.accounts.update((list) =>
      (list ?? []).map((a) => (a.id === accountId ? { ...a, marketStatus: status } : a)),
    );
  }

  private setTransfer(accountId: number, patch: Partial<TransferState>): void {
    this.transfer.update((all) => {
      const current: TransferState = all[accountId] ?? { busy: false, error: null, offers: null };
      return { ...all, [accountId]: { ...current, ...patch } };
    });
  }

  private setDeleteError(accountId: number, message: string | null): void {
    this.deleteErrors.update((all) => ({ ...all, [accountId]: message ?? '' }));
  }
}
