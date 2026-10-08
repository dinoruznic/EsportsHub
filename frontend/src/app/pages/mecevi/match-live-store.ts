import { DestroyRef, Injectable, Injector, Signal, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { MatchesApi } from '../../core/api/matches-api';
import { BracketMatch, MatchEventRecord } from '../../core/api/models';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { MatchTopicMessage, SnapshotStats, matchTopic } from '../../core/realtime/messages';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { buildBracket, roundLabel } from '../turniri/bracket/bracket-layout';
import { FeedContext, FeedEntry, fromMessage, historyFeed, prependEntry } from './match-events';
import { formatClock, liveClock } from './match-format';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Zakazan',
  LIVE: 'Uživo',
  FINISHED: 'Završen',
  CANCELLED: 'Otkazan',
};

@Injectable()
export class MatchLiveStore {
  private readonly matchesApi = inject(MatchesApi);
  private readonly tournamentsApi = inject(TournamentsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  readonly realtime = inject(RealtimeService);

  readonly id = signal(0);
  readonly match = signal<BracketMatch | null>(null);
  readonly snapshot = signal<SnapshotStats | null>(null);
  readonly snapshotAt = signal<number | null>(null);
  readonly loadError = signal<string | null>(null);
  readonly now = signal(Date.now());
  private readonly history = signal<MatchEventRecord[]>([]);
  private readonly liveEntries = signal<FeedEntry[]>([]);

  private readonly tournamentId = computed(() => this.match()?.tournamentId ?? null);
  readonly bracket = rxResource({
    params: () => this.tournamentId() ?? undefined,
    stream: ({ params }) => this.tournamentsApi.bracket(params),
  });
  private readonly games = rxResource({ stream: () => this.gamesApi.list() });

  readonly tournament = computed(() => {
    const match = this.match();
    return match?.tournamentId
      ? { id: match.tournamentId, name: match.tournamentName ?? 'Turnir' }
      : null;
  });
  readonly columns = computed(() =>
    this.bracket.hasValue() ? buildBracket(this.bracket.value(), {}) : [],
  );
  readonly card = computed(() => {
    for (const column of this.columns()) {
      const card = column.matches.find((match) => match.id === this.id());
      if (card) {
        return { round: column.label, number: card.number };
      }
    }
    return null;
  });
  readonly gameName = computed(() => {
    const code = this.match()?.gameCode;
    const games = this.games.hasValue() ? this.games.value() : [];
    return code ? (games.find((g) => g.code === code)?.name ?? code) : null;
  });
  readonly roundName = computed(() => {
    const match = this.match();
    return this.card()?.round ?? (match?.roundName ? roundLabel(match.roundName, 0) : null);
  });
  readonly eyebrow = computed(() => {
    if (!this.match()?.gameCode) {
      return 'Meč';
    }
    const card = this.card();
    return [this.gameName(), this.roundName(), card ? `M${card.number}` : null]
      .filter(Boolean)
      .join(' · ');
  });
  readonly feed = computed(() =>
    this.liveEntries().reduce(
      (feed, entry) => prependEntry(feed, entry),
      historyFeed(this.history(), this.feedContext()),
    ),
  );
  readonly statusLabel = computed(() => STATUS_LABELS[this.match()?.status ?? ''] ?? '');
  readonly live = computed(() => this.match()?.status === 'LIVE');
  readonly finished = computed(() => this.match()?.status === 'FINISHED');
  readonly clock = computed(() => {
    const base = this.snapshot()?.gameTimeSeconds ?? null;
    const at = this.snapshotAt();
    if (base === null || at === null) {
      return null;
    }
    return this.live() ? liveClock(base, at, this.now()) : formatClock(base);
  });

  connect(id: Signal<number>): void {
    toObservable(id, { injector: this.injector })
      .pipe(
        switchMap((value) => {
          this.id.set(value);
          this.load(value);
          return this.realtime.subscribe<MatchTopicMessage>(matchTopic(value));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((message) => this.apply(message));

    this.realtime.reconnected
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.reload());

    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  reload(): void {
    this.load(this.id());
  }

  setMatch(match: BracketMatch): void {
    if (match.id === this.id()) {
      this.match.set({ ...this.match(), ...match });
    }
  }

  roundOf(matchId: number | null): string | null {
    if (matchId === null) {
      return null;
    }
    return (
      this.columns().find((column) => column.matches.some((match) => match.id === matchId))
        ?.label ?? null
    );
  }

  private feedContext(): FeedContext {
    return { match: this.match(), roundOf: (matchId) => this.roundOf(matchId) };
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
