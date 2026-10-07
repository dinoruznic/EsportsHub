import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { formatLabel } from '../../core/api/models';
import { TeamsApi } from '../../core/api/teams-api';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { isPowerOfTwo } from '../../shared/format';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { BracketView } from './bracket/bracket-view';
import { RegisteredTeams } from './registered-teams';
import { TournamentStats } from './tournament-stats';

@Component({
  selector: 'app-turnir-detalji',
  imports: [
    RouterLink,
    BracketView,
    ConfirmInline,
    EmptyState,
    ErrorState,
    Skeleton,
    TeamHex,
    RegisteredTeams,
    TournamentStats,
  ],
  templateUrl: './turnir-detalji.html',
  styleUrl: './turnir-detalji.scss',
})
export default class TurnirDetalji {
  private readonly api = inject(TournamentsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly teamsApi = inject(TeamsApi);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  private readonly id = toSignal(inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))), {
    requireSync: true,
  });

  protected readonly tournament = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.get(params) });
  protected readonly registrations = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.api.registrations(params),
  });
  protected readonly bracket = rxResource({ params: () => this.id(), stream: ({ params }) => this.api.bracket(params) });
  private readonly games = rxResource({ stream: () => this.gamesApi.list() });

  protected readonly t = computed(() => (this.tournament.hasValue() ? this.tournament.value() : null));
  protected readonly game = computed(() => {
    const t = this.t();
    return t && this.games.hasValue() ? (this.games.value().find((g) => g.code === t.gameCode) ?? null) : null;
  });

  protected readonly active = computed(() =>
    (this.registrations.hasValue() ? this.registrations.value() : [])
      .filter((r) => r.status === 'REGISTERED')
      .sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999) || a.registeredAt.localeCompare(b.registeredAt)),
  );
  protected readonly seeds = computed(() =>
    Object.fromEntries(this.active().filter((r) => r.seed !== null).map((r) => [r.teamId, r.seed!])),
  );
  protected readonly hasBracket = computed(() => this.bracket.hasValue() && this.bracket.value().rounds.length > 0);

  private readonly username = computed(() => this.auth.currentUser()?.username ?? null);
  protected readonly isAdmin = computed(() => this.auth.hasRole('ADMIN'));
  protected readonly isOrganizer = computed(() => !!this.t() && this.t()!.organizerUsername === this.username());

  private readonly myTeams = rxResource({
    params: () => {
      const username = this.username();
      const game = this.game();
      return username && game && this.t()?.status === 'REGISTRATION' ? { username, gameId: game.id } : undefined;
    },
    stream: ({ params }) => this.teamsApi.captainedBy(params.username, params.gameId),
  });

  protected readonly myRegistrations = computed(() => {
    const mine = new Set((this.myTeams.hasValue() ? this.myTeams.value() : []).map((team) => team.id));
    return this.active().filter((r) => mine.has(r.teamId));
  });
  protected readonly eligibleTeams = computed(() => {
    const registered = new Set(this.active().map((r) => r.teamId));
    return (this.myTeams.hasValue() ? this.myTeams.value() : []).filter((team) => !registered.has(team.id));
  });
  protected readonly isFull = computed(() => {
    const max = this.t()?.maxTeams;
    return !!max && this.active().length >= max;
  });

  protected readonly canRegister = computed(
    () => this.t()?.status === 'REGISTRATION' && this.registrations.hasValue() && this.eligibleTeams().length > 0,
  );
  protected readonly canWithdraw = computed(
    () => this.t()?.status === 'REGISTRATION' && this.myRegistrations().length > 0,
  );
  protected readonly canGenerate = computed(
    () =>
      (this.isOrganizer() || this.isAdmin()) &&
      this.t()?.status === 'REGISTRATION' &&
      this.bracket.hasValue() &&
      !this.hasBracket(),
  );
  protected readonly generateReady = computed(() => isPowerOfTwo(this.active().length));
  protected readonly canReview = computed(() => this.isAdmin() && this.t()?.status === 'PENDING');
  protected readonly hasActions = computed(
    () => this.canRegister() || this.canWithdraw() || this.canGenerate() || this.canReview(),
  );

  protected readonly eyebrow = computed(() => {
    const t = this.t();
    if (!t) {
      return '';
    }
    const parts = [this.game()?.name ?? t.gameCode, formatLabel(t.format)];
    if (t.maxTeams) {
      parts.push(`${t.maxTeams} timova`);
    }
    return parts.join(' · ');
  });
  protected readonly statusNote = computed(() => {
    switch (this.t()?.status) {
      case 'PENDING':
        return 'Čeka odobrenje administratora.';
      case 'REJECTED':
        return 'Turnir je odbijen.';
      case 'CANCELLED':
        return 'Turnir je otkazan.';
      default:
        return null;
    }
  });

  protected readonly picking = signal(false);
  protected readonly selectedTeam = signal<number | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const t = this.t();
      if (t) {
        this.title.setTitle(`${t.name} · EsportsHub`);
      }
    });
  }

  protected loadError(): string {
    return toApiError(this.tournament.error()).message;
  }

  protected bracketError(): string {
    return toApiError(this.bracket.error()).message;
  }

  protected openPicker(): void {
    this.actionError.set(null);
    this.selectedTeam.set(this.eligibleTeams()[0]?.id ?? null);
    this.picking.set(true);
  }

  protected register(): void {
    const teamId = this.selectedTeam();
    if (teamId === null) {
      return;
    }
    this.run(this.api.register(this.id(), teamId), () => {
      this.picking.set(false);
      this.registrations.reload();
    });
  }

  protected withdraw(registrationId: number): void {
    this.run(this.api.withdraw(this.id(), registrationId), () => this.registrations.reload());
  }

  protected generate(): void {
    this.run(this.api.generateBracket(this.id()), () => this.reloadAll());
  }

  protected approve(): void {
    this.run(this.api.approve(this.id()), () => this.tournament.reload());
  }

  protected reject(): void {
    this.run(this.api.reject(this.id()), () => this.tournament.reload());
  }

  protected reloadAll(): void {
    this.tournament.reload();
    this.registrations.reload();
    this.bracket.reload();
  }

  private run(request: Observable<unknown>, done: () => void): void {
    this.busy.set(true);
    this.actionError.set(null);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        done();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.actionError.set(toApiError(error).message);
      },
    });
  }
}
