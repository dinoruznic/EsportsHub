import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { Tournament, TournamentStatus } from '../../core/api/models';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { AuthService } from '../../core/auth/auth.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { PendingTournaments } from './pending-tournaments';
import { TournamentCard } from './tournament-card';

interface StatusFilter {
  value: string;
  label: string;
  status: TournamentStatus | null;
}

const STATUS_FILTERS: StatusFilter[] = [
  { value: '', label: 'Sve', status: null },
  { value: 'prijave', label: 'Prijave otvorene', status: 'REGISTRATION' },
  { value: 'u-toku', label: 'U toku', status: 'ONGOING' },
  { value: 'zavrseni', label: 'Završeni', status: 'COMPLETED' },
];

const STATUS_ORDER: TournamentStatus[] = ['REGISTRATION', 'ONGOING', 'PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED'];

@Component({
  selector: 'app-turniri',
  imports: [RouterLink, EmptyState, ErrorState, Skeleton, PendingTournaments, TournamentCard],
  templateUrl: './turniri.html',
  styleUrl: './turniri.scss',
})
export default class Turniri {
  private readonly api = inject(TournamentsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly statusFilters = STATUS_FILTERS;
  protected readonly canCreate = this.auth.isLoggedIn;
  protected readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly game = computed(() => this.query().get('igra') ?? '');
  protected readonly status = computed(() => this.query().get('status') ?? '');
  protected readonly search = computed(() => this.query().get('q') ?? '');

  protected readonly games = rxResource({ stream: () => this.gamesApi.list() });
  protected readonly gameNames = computed(() =>
    Object.fromEntries((this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name])),
  );

  protected readonly tournaments = rxResource({ stream: () => this.api.list() });

  protected readonly counts = rxResource({
    params: () => (this.tournaments.hasValue() ? this.tournaments.value().map((t) => t.id) : undefined),
    stream: ({ params: ids }) =>
      ids.length === 0
        ? of({} as Record<number, number>)
        : forkJoin(
            ids.map((id) =>
              this.api.registrations(id).pipe(
                map((list) => list.filter((r) => r.status === 'REGISTERED').length),
                catchError(() => of(null)),
              ),
            ),
          ).pipe(map((values) => Object.fromEntries(ids.map((id, i) => [id, values[i]])) as Record<number, number>)),
  });

  protected readonly visible = computed(() => {
    if (!this.tournaments.hasValue()) {
      return [];
    }
    const game = this.game();
    const status = STATUS_FILTERS.find((item) => item.value === this.status())?.status ?? null;
    const search = this.search().trim().toLocaleLowerCase('bs');
    return this.tournaments
      .value()
      .filter((t) => !game || t.gameCode === game)
      .filter((t) => !status || t.status === status)
      .filter((t) => !search || t.name.toLocaleLowerCase('bs').includes(search))
      .sort(byStatusThenNewest);
  });

  protected readonly filtered = computed(
    () => this.game() !== '' || this.status() !== '' || this.search() !== '',
  );

  protected loadError(): string {
    return toApiError(this.tournaments.error()).message;
  }

  protected count(id: number): number | null {
    return this.counts.hasValue() ? (this.counts.value()[id] ?? null) : null;
  }

  protected setFilter(name: 'igra' | 'status' | 'q', value: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [name]: value || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected clearFilters(): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  protected refresh(): void {
    this.tournaments.reload();
  }
}

function byStatusThenNewest(a: Tournament, b: Tournament): number {
  const order = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
  return order !== 0 ? order : b.createdAt.localeCompare(a.createdAt);
}
