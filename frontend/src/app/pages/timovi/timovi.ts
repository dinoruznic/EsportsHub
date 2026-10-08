import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { Team } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { TeamsApi } from '../../core/api/teams-api';
import { AuthService } from '../../core/auth/auth.service';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamCard } from './team-card';

@Component({
  selector: 'app-timovi',
  imports: [RouterLink, EmptyState, ErrorState, Skeleton, TeamCard],
  templateUrl: './timovi.html',
  styleUrl: './timovi.scss',
})
export default class Timovi {
  private readonly teamsApi = inject(TeamsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly playersApi = inject(PlayersApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly game = computed(() => this.query().get('igra') ?? '');
  protected readonly search = computed(() => this.query().get('q') ?? '');

  protected readonly teams = rxResource({ stream: () => this.teamsApi.list() });
  protected readonly games = rxResource({ stream: () => this.gamesApi.list() });
  private readonly myProfile = rxResource({
    params: () => this.auth.currentUser()?.username,
    stream: ({ params }) => this.playersApi.get(params).pipe(catchError(() => of(null))),
  });

  protected readonly gameNames = computed<Record<string, string>>(() =>
    Object.fromEntries(
      (this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name]),
    ),
  );
  private readonly myTeamIds = computed(() => {
    const username = this.auth.currentUser()?.username;
    const ids = new Set(
      (this.myProfile.hasValue() ? (this.myProfile.value()?.teams ?? []) : []).map((t) => t.id),
    );
    for (const team of this.allTeams()) {
      if (team.captainUsername === username) {
        ids.add(team.id);
      }
    }
    return ids;
  });
  protected readonly allTeams = computed(() =>
    this.teams.hasValue()
      ? [...this.teams.value()].sort((a, b) => a.name.localeCompare(b.name, 'bs'))
      : [],
  );
  protected readonly myTeams = computed(() =>
    this.allTeams().filter((t) => this.myTeamIds().has(t.id)),
  );
  protected readonly visible = computed(() => {
    const game = this.game();
    const search = this.search().trim().toLocaleLowerCase('bs');
    return this.allTeams().filter(
      (team: Team) =>
        (!game || team.gameCode === game) &&
        (!search ||
          team.name.toLocaleLowerCase('bs').includes(search) ||
          team.tag.toLocaleLowerCase('bs').includes(search)),
    );
  });
  protected readonly filtered = computed(() => this.game() !== '' || this.search() !== '');

  protected loadError(): string {
    return toApiError(this.teams.error()).message;
  }

  protected setFilter(name: 'igra' | 'q', value: string): void {
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
}
