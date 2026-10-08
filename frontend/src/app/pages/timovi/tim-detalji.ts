import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { TeamMember } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { TeamsApi } from '../../core/api/teams-api';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { formatDate, formatKm } from '../../shared/format';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { formatRating, rankLabel, ratingLabel } from '../profil/account-format';
import { RankEmblem } from '../profil/rank-emblem';
import { membersLabel } from './team-format';

const CONTRACT_STATUS: Record<string, string> = {
  ACTIVE: 'Aktivan',
  TERMINATED: 'Raskinut',
  EXPIRED: 'Istekao',
};

@Component({
  selector: 'app-tim-detalji',
  imports: [RouterLink, ConfirmInline, EmptyState, ErrorState, Skeleton, TeamHex, RankEmblem],
  templateUrl: './tim-detalji.html',
  styleUrl: './tim-detalji.scss',
})
export default class TimDetalji {
  private readonly teamsApi = inject(TeamsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly playersApi = inject(PlayersApi);
  private readonly auth = inject(AuthService);
  private readonly title = inject(Title);

  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
    { requireSync: true },
  );

  protected readonly detail = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.teamsApi.get(params),
  });
  protected readonly contracts = rxResource({
    params: () => this.id(),
    stream: ({ params }) => this.teamsApi.contracts(params).pipe(catchError(() => of([]))),
  });
  private readonly games = rxResource({ stream: () => this.gamesApi.list() });
  private readonly captain = rxResource({
    params: () => (this.detail.hasValue() ? this.detail.value().team.captainUsername : undefined),
    stream: ({ params }) => this.playersApi.get(params).pipe(catchError(() => of(null))),
  });

  protected readonly team = computed(() =>
    this.detail.hasValue() ? this.detail.value().team : null,
  );
  protected readonly members = computed(() =>
    this.detail.hasValue() ? this.detail.value().members.filter((member) => member.active) : [],
  );
  protected readonly missing = computed(() => {
    const error = this.detail.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  private readonly me = computed(() => this.auth.currentUser()?.username ?? null);
  protected readonly isCaptain = computed(
    () => !!this.team() && this.team()!.captainUsername === this.me(),
  );
  protected readonly game = computed(() => {
    const team = this.team();
    return (
      (this.games.hasValue() ? this.games.value() : []).find((g) => g.code === team?.gameCode) ??
      null
    );
  });
  protected readonly captainName = computed(() => {
    const profile = this.captain.hasValue() ? this.captain.value() : null;
    return profile?.displayName || this.team()?.captainUsername || '';
  });
  protected readonly eyebrow = computed(() => {
    const team = this.team();
    return team
      ? [this.game()?.name ?? team.gameCode, team.region].filter(Boolean).join(' · ')
      : '';
  });
  protected readonly founded = computed(() => {
    const created = this.team()?.createdAt;
    return created ? formatDate(created) : '—';
  });
  protected readonly membersCount = computed(() => membersLabel(this.members().length));

  protected readonly removing = signal<number | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly adding = signal(false);
  protected readonly addUsername = signal('');
  protected readonly addBusy = signal(false);
  protected readonly addError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const team = this.team();
      if (team) {
        this.title.setTitle(`${team.name} · EsportsHub`);
      }
    });
  }

  protected loadError(): string {
    return toApiError(this.detail.error()).message;
  }

  protected profileLink(username: string): string[] {
    return username === this.me() ? ['/profil'] : ['/igraci', username];
  }

  protected isCaptainMember(member: TeamMember): boolean {
    return member.ownerUsername === this.team()?.captainUsername;
  }

  protected rank(member: TeamMember): string {
    return rankLabel(member.rank);
  }

  protected rating(member: TeamMember): string | null {
    return member.rating === null ? null : formatRating(member.rating);
  }

  protected ratingName(): string {
    return ratingLabel(this.team()?.gameCode ?? '');
  }

  protected salary(value: number | null): string {
    return value === null ? '—' : formatKm(value);
  }

  protected date(value: string | null): string {
    return value ? formatDate(value) : '—';
  }

  protected contractStatus(status: string): string {
    return CONTRACT_STATUS[status] ?? status;
  }

  protected remove(member: TeamMember): void {
    this.removing.set(member.membershipId);
    this.actionError.set(null);
    this.teamsApi.removeMember(this.id(), member.membershipId).subscribe({
      next: () => {
        this.removing.set(null);
        this.detail.reload();
      },
      error: (error: unknown) => {
        this.removing.set(null);
        this.actionError.set(toApiError(error).message);
      },
    });
  }

  protected openAdd(): void {
    this.addUsername.set('');
    this.addError.set(null);
    this.adding.set(true);
  }

  protected addMember(): void {
    const username = this.addUsername().trim();
    const team = this.team();
    if (!username || !team || this.addBusy()) {
      this.addError.set(username ? null : 'Upiši korisničko ime igrača.');
      return;
    }
    this.addBusy.set(true);
    this.addError.set(null);
    this.playersApi.gameAccounts(username).subscribe({
      next: (accounts) => {
        const account = accounts.find((a) => a.gameCode === team.gameCode);
        if (!account) {
          this.addBusy.set(false);
          this.addError.set(
            `Igrač ${username} nema nalog za ${this.game()?.name ?? team.gameCode}.`,
          );
          return;
        }
        this.teamsApi.addMember(team.id, account.id).subscribe({
          next: () => {
            this.addBusy.set(false);
            this.adding.set(false);
            this.detail.reload();
          },
          error: (error: unknown) => {
            this.addBusy.set(false);
            this.addError.set(toApiError(error).message);
          },
        });
      },
      error: (error: unknown) => {
        this.addBusy.set(false);
        this.addError.set(toApiError(error).message);
      },
    });
  }
}
