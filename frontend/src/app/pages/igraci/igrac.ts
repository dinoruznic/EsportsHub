import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { GameAccount } from '../../core/api/models';
import { PlayersApi } from '../../core/api/players-api';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { AccountCard } from '../profil/account-card';
import { ProfileHeader } from '../profil/profile-header';

@Component({
  selector: 'app-igrac',
  imports: [RouterLink, AccountCard, EmptyState, ErrorState, Skeleton, ProfileHeader],
  templateUrl: './igrac.html',
  styleUrl: './igrac.scss',
})
export default class Igrac {
  private readonly playersApi = inject(PlayersApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly title = inject(Title);

  protected readonly username = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => params.get('username') ?? '')),
    { requireSync: true },
  );

  protected readonly data = rxResource({
    params: () => this.username(),
    stream: ({ params }) =>
      forkJoin({
        profile: this.playersApi.get(params),
        accounts: this.playersApi.gameAccounts(params),
        games: this.gamesApi.list(),
      }),
  });

  protected readonly missing = computed(() => {
    const error = this.data.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly accounts = computed(() =>
    this.data.hasValue() ? [...this.data.value().accounts].sort((a, b) => a.id - b.id) : [],
  );

  constructor() {
    effect(() => {
      if (this.data.hasValue()) {
        const profile = this.data.value().profile;
        this.title.setTitle(`${profile.displayName || profile.username} · EsportsHub`);
      }
    });
  }

  protected loadError(): string {
    return toApiError(this.data.error()).message;
  }

  protected rankTypeOf(account: GameAccount): string {
    const games = this.data.hasValue() ? this.data.value().games : [];
    return games.find((game) => game.code === account.gameCode)?.rankType ?? 'NONE';
  }
}
