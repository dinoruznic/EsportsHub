import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  merge,
  of,
  switchMap,
} from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MatchesApi } from '../../core/api/matches-api';
import { LiveMatch } from '../../core/api/models';
import {
  SnapshotStats,
  TournamentTopicMessage,
  tournamentTopic,
} from '../../core/realtime/messages';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ConnectionIndicator } from '../../shared/connection-indicator/connection-indicator';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { ErrorState } from '../../shared/error-state/error-state';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { LiveClock } from '../mecevi/live-clock';
import { ClockView, clockView } from '../mecevi/match-format';
import { roundLabel } from '../turniri/bracket/bracket-layout';

interface Clock {
  seconds: number;
  at: number;
}

const REFETCH_ON = new Set(['STARTED', 'FINISHED', 'WINNER_ADVANCED', 'TOURNAMENT_COMPLETED']);

@Component({
  selector: 'app-uzivo',
  imports: [
    RouterLink,
    ConnectionIndicator,
    EmptyState,
    ErrorState,
    GameBadge,
    LiveClock,
    Skeleton,
    TeamHex,
  ],
  templateUrl: './uzivo.html',
  styleUrl: './uzivo.scss',
})
export default class Uzivo {
  private readonly api = inject(MatchesApi);
  private readonly gamesApi = inject(GamesApi);
  protected readonly realtime = inject(RealtimeService);

  protected readonly matches = signal<LiveMatch[] | null>(null);
  protected readonly loadError = signal<string | null>(null);
  private readonly clocks = signal<Record<number, Clock>>({});
  private readonly now = signal(Date.now());
  private readonly refetch = new Subject<void>();

  private readonly games = rxResource({ stream: () => this.gamesApi.list() });
  protected readonly gameNames = computed<Record<string, string>>(() =>
    Object.fromEntries(
      (this.games.hasValue() ? this.games.value() : []).map((g) => [g.code, g.name]),
    ),
  );

  protected readonly live = computed(() =>
    (this.matches() ?? []).filter((m) => m.status === 'LIVE'),
  );
  protected readonly upcoming = computed(() =>
    (this.matches() ?? []).filter((m) => m.status === 'SCHEDULED'),
  );
  private readonly tournamentIds = computed(() =>
    [...new Set((this.matches() ?? []).map((m) => m.tournamentId))].sort((a, b) => a - b),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.load();

    toObservable(this.tournamentIds)
      .pipe(
        distinctUntilChanged((a, b) => a.join() === b.join()),
        switchMap((ids) =>
          ids.length === 0
            ? EMPTY
            : merge(
                ...ids.map((id) =>
                  this.realtime.subscribe<TournamentTopicMessage>(tournamentTopic(id)),
                ),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((message) => this.apply(message));

    this.refetch.pipe(debounceTime(600), takeUntilDestroyed()).subscribe(() => this.load());
    this.realtime.reconnected.pipe(takeUntilDestroyed()).subscribe(() => this.load());

    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected round(match: LiveMatch): string {
    return match.roundName ? roundLabel(match.roundName, match.roundNumber ?? 0) : '';
  }

  protected clock(match: LiveMatch): ClockView {
    const clock = this.clocks()[match.matchId];
    return clockView(clock?.seconds ?? null, clock?.at ?? null, this.now());
  }

  protected load(): void {
    this.loadError.set(null);
    this.api
      .live()
      .pipe(
        switchMap((list) => {
          const live = list.filter((m) => m.status === 'LIVE');
          const snapshots =
            live.length === 0
              ? of([])
              : forkJoin(
                  live.map((m) => this.api.snapshot(m.matchId).pipe(catchError(() => of(null)))),
                );
          return snapshots.pipe(map((values) => ({ list, values })));
        }),
      )
      .subscribe({
        next: ({ list, values }) => {
          this.matches.set(list);
          const clocks: Record<number, Clock> = {};
          for (const snapshot of values) {
            if (snapshot?.gameTimeSeconds != null) {
              clocks[snapshot.matchId] = {
                seconds: snapshot.gameTimeSeconds,
                at: Math.min(Date.parse(snapshot.capturedAt) || Date.now(), Date.now()),
              };
            }
          }
          this.clocks.set(clocks);
        },
        error: (error: unknown) => this.loadError.set(toApiError(error).message),
      });
  }

  private apply(message: TournamentTopicMessage): void {
    if (message.type === 'LIVE_SNAPSHOT') {
      const stats = message.data as unknown as SnapshotStats | null;
      if (stats?.gameTimeSeconds != null) {
        const seconds = stats.gameTimeSeconds;
        this.clocks.update((clocks) => ({
          ...clocks,
          [message.matchId]: { seconds, at: Date.now() },
        }));
      }
      return;
    }
    if (message.match) {
      const view = message.match;
      this.matches.update((list) =>
        (list ?? []).map((m) =>
          m.matchId === view.id
            ? {
                ...m,
                status: view.status,
                teamA: view.teamA,
                teamB: view.teamB,
                scoreA: view.scoreA,
                scoreB: view.scoreB,
              }
            : m,
        ),
      );
    }
    if (REFETCH_ON.has(message.type)) {
      this.refetch.next();
    }
  }
}
