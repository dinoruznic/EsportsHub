import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MatchesApi } from '../../core/api/matches-api';
import { BracketMatch, MatchEventRecord } from '../../core/api/models';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { MatchTopicMessage, SnapshotStats, matchTopic } from '../../core/realtime/messages';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ConnectionIndicator } from '../../shared/connection-indicator/connection-indicator';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { buildBracket } from '../turniri/bracket/bracket-layout';
import { FeedContext, FeedEntry, fromMessage, historyFeed, prependEntry } from './match-events';
import { MatchFeed } from './match-feed';
import { formatClock, liveClock } from './match-format';
import { MatchStats } from './match-stats';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Zakazan',
  LIVE: 'Uživo',
  FINISHED: 'Završen',
  CANCELLED: 'Otkazan',
};

@Component({
  selector: 'app-mec',
  imports: [RouterLink, ConnectionIndicator, ErrorState, Skeleton, TeamHex, MatchFeed, MatchStats],
  templateUrl: './mec.html',
  styleUrl: './mec.scss',
})
export default class Mec {
  private readonly matchesApi = inject(MatchesApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly title = inject(Title);
  protected readonly realtime = inject(RealtimeService);

  private readonly route = inject(ActivatedRoute);
  protected readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => Number(params.get('id')))),
    {
      requireSync: true,
    },
  );
  private readonly hint = toSignal(
    this.route.queryParamMap.pipe(map((params) => Number(params.get('turnir')) || null)),
    { requireSync: true },
  );

  protected readonly match = signal<BracketMatch | null>(null);
  protected readonly snapshot = signal<SnapshotStats | null>(null);
  private readonly history = signal<MatchEventRecord[]>([]);
  private readonly liveEntries = signal<FeedEntry[]>([]);
  private readonly snapshotAt = signal(0);
  protected readonly loadError = signal<string | null>(null);
  private readonly tournamentId = signal<number | null>(null);
  private readonly now = signal(Date.now());

  private readonly context = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) =>
      forkJoin({
        tournament: this.tournamentsApi.get(params),
        bracket: this.tournamentsApi.bracket(params),
        games: this.gamesApi.list(),
      }),
  });

  protected readonly tournament = computed(() =>
    this.context.hasValue() ? this.context.value().tournament : null,
  );
  private readonly columns = computed(() =>
    this.context.hasValue() ? buildBracket(this.context.value().bracket, {}) : [],
  );
  protected readonly card = computed(() => {
    for (const column of this.columns()) {
      const card = column.matches.find((match) => match.id === this.id());
      if (card) {
        return { round: column.label, number: card.number };
      }
    }
    return null;
  });
  protected readonly eyebrow = computed(() => {
    const value = this.context.hasValue() ? this.context.value() : null;
    const card = this.card();
    if (!value) {
      return 'Meč';
    }
    const game =
      value.games.find((g) => g.code === value.tournament.gameCode)?.name ??
      value.tournament.gameCode;
    return [game, card?.round, card ? `M${card.number}` : null].filter(Boolean).join(' · ');
  });

  protected readonly feed = computed(() =>
    this.liveEntries().reduce(
      (feed, entry) => prependEntry(feed, entry),
      historyFeed(this.history(), this.feedContext()),
    ),
  );
  protected readonly statusLabel = computed(() => STATUS_LABELS[this.match()?.status ?? ''] ?? '');
  protected readonly live = computed(() => this.match()?.status === 'LIVE');
  protected readonly finished = computed(() => this.match()?.status === 'FINISHED');
  protected readonly clock = computed(() => {
    const base = this.snapshot()?.gameTimeSeconds ?? null;
    if (base === null) {
      return null;
    }
    return this.live() ? liveClock(base, this.snapshotAt(), this.now()) : formatClock(base);
  });

  constructor() {
    const destroyRef = inject(DestroyRef);

    toObservable(this.id)
      .pipe(
        switchMap((id) => {
          this.load(id);
          this.resolveTournament(id);
          return this.realtime.subscribe<MatchTopicMessage>(matchTopic(id));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((message) => this.apply(message));

    this.realtime.reconnected.pipe(takeUntilDestroyed()).subscribe(() => this.load(this.id()));

    const timer = setInterval(() => {
      if (this.live()) {
        this.now.set(Date.now());
      }
    }, 1000);
    destroyRef.onDestroy(() => clearInterval(timer));

    effect(() => {
      const match = this.match();
      if (match) {
        const a = match.teamA?.name ?? 'Čeka se';
        const b = match.teamB?.name ?? 'Čeka se';
        this.title.setTitle(`${a} vs ${b} · EsportsHub`);
      }
    });
  }

  protected retry(): void {
    this.load(this.id());
  }

  private feedContext(): FeedContext {
    return {
      match: this.match(),
      roundOf: (matchId) =>
        this.columns().find((column) => column.matches.some((match) => match.id === matchId))
          ?.label ?? null,
    };
  }

  private load(id: number): void {
    this.loadError.set(null);
    forkJoin({
      match: this.matchesApi.get(id),
      snapshot: this.matchesApi.snapshot(id).pipe(catchError(() => of(null))),
      events: this.matchesApi.events(id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ match, snapshot, events }) => {
        this.match.set(match);
        this.history.set(events);
        this.liveEntries.set([]);
        if (snapshot) {
          this.setSnapshot(snapshot, Date.parse(snapshot.capturedAt));
        }
      },
      error: (error: unknown) => this.loadError.set(toApiError(error).message),
    });
  }

  private resolveTournament(id: number): void {
    const hint = this.hint();
    if (hint) {
      this.tournamentId.set(hint);
      return;
    }
    this.matchesApi
      .live()
      .pipe(catchError(() => of([])))
      .subscribe((list) =>
        this.tournamentId.set(list.find((item) => item.matchId === id)?.tournamentId ?? null),
      );
  }

  private apply(message: MatchTopicMessage): void {
    const entry = fromMessage(message, this.feedContext());
    this.liveEntries.update((entries) =>
      entry.type === 'LIVE_SNAPSHOT' && entries.at(-1)?.type === 'LIVE_SNAPSHOT'
        ? [...entries.slice(0, -1), entry]
        : [...entries, entry],
    );
    if (message.type === 'LIVE_SNAPSHOT') {
      this.setSnapshot(message.data as unknown as SnapshotStats, Date.parse(message.at));
      return;
    }
    if (message.match && message.match.id === this.id()) {
      this.match.set(message.match);
    }
  }

  private setSnapshot(snapshot: SnapshotStats, at: number): void {
    this.snapshot.set({
      gameTimeSeconds: snapshot.gameTimeSeconds ?? null,
      killsA: snapshot.killsA ?? null,
      killsB: snapshot.killsB ?? null,
      goldA: snapshot.goldA ?? null,
      goldB: snapshot.goldB ?? null,
      towersA: snapshot.towersA ?? null,
      towersB: snapshot.towersB ?? null,
    });
    this.snapshotAt.set(Number.isFinite(at) ? Math.min(at, Date.now()) : Date.now());
    this.now.set(Date.now());
  }
}
