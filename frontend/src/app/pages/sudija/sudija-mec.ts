import { Component, computed, effect, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { MatchesApi } from '../../core/api/matches-api';
import { BracketMatch } from '../../core/api/models';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { ConnectionIndicator } from '../../shared/connection-indicator/connection-indicator';
import { ErrorState } from '../../shared/error-state/error-state';
import { MatchStatus } from '../../shared/match-status/match-status';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { MatchFeed } from '../mecevi/match-feed';
import { MatchLiveStore } from '../mecevi/match-live-store';
import { MatchScoreboard } from '../mecevi/match-scoreboard';
import { MatchStats } from '../mecevi/match-stats';
import { AgentCard } from './agent-card';
import { finishQuestion } from './referee-format';

type Action = 'start' | 'score' | 'finish';

const STEPS = [
  { status: 'SCHEDULED', label: 'Zakazan' },
  { status: 'LIVE', label: 'Uživo' },
  { status: 'FINISHED', label: 'Završen' },
];

@Component({
  selector: 'app-sudija-mec',
  imports: [
    RouterLink,
    AgentCard,
    ConfirmInline,
    ConnectionIndicator,
    ErrorState,
    MatchFeed,
    MatchScoreboard,
    MatchStats,
    MatchStatus,
    Skeleton,
  ],
  providers: [MatchLiveStore],
  templateUrl: './sudija-mec.html',
  styleUrl: './sudija-mec.scss',
})
export default class SudijaMec {
  private readonly matchesApi = inject(MatchesApi);
  private readonly title = inject(Title);
  protected readonly store = inject(MatchLiveStore);

  protected readonly match = this.store.match;
  protected readonly live = this.store.live;
  protected readonly finished = this.store.finished;

  protected readonly busy = signal<Action | null>(null);
  protected readonly errors = signal<Partial<Record<Action, string>>>({});
  protected readonly saved = signal(false);

  protected readonly draftA = linkedSignal(() => this.match()?.scoreA ?? 0);
  protected readonly draftB = linkedSignal(() => this.match()?.scoreB ?? 0);

  protected readonly steps = computed(() => {
    const current = STEPS.findIndex((step) => step.status === this.match()?.status);
    return STEPS.map((step, index) => ({
      ...step,
      state: index < current ? 'done' : index === current ? 'current' : 'todo',
    }));
  });
  protected readonly startBlocker = computed(() => {
    const match = this.match();
    if (!match) {
      return null;
    }
    if (match.status !== 'SCHEDULED') {
      return 'Meč je već počeo.';
    }
    return match.teamA && match.teamB ? null : 'Meč čeka oba tima iz prethodne runde.';
  });
  protected readonly dirty = computed(() => {
    const match = this.match();
    return (
      !!match && (this.draftA() !== (match.scoreA ?? 0) || this.draftB() !== (match.scoreB ?? 0))
    );
  });
  protected readonly tie = computed(() => this.draftA() === this.draftB());
  protected readonly leader = computed(() => {
    const match = this.match();
    if (!match || this.tie()) {
      return null;
    }
    return this.draftA() > this.draftB() ? match.teamA : match.teamB;
  });
  protected readonly finishText = computed(() => {
    if (this.tie()) {
      return 'Neriješeno nije dozvoljeno.';
    }
    return finishQuestion(
      this.draftA(),
      this.draftB(),
      this.leader()?.name ?? 'Pobjednik',
      this.match()?.nextMatchId === null,
    );
  });
  protected readonly outcome = computed(() => {
    const match = this.match();
    if (!match || match.status !== 'FINISHED') {
      return null;
    }
    const winner = [match.teamA, match.teamB].find((team) => team?.id === match.winnerTeamId);
    if (match.nextMatchId === null) {
      return `Turnir završen, prvak ${winner?.name ?? 'je poznat'}.`;
    }
    return `Pobjednik ide u ${this.store.roundOf(match.nextMatchId) ?? 'sljedeću rundu'}.`;
  });

  constructor() {
    const id = toSignal(
      inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
      { requireSync: true },
    );
    this.store.connect(id);

    effect(() => {
      const match = this.match();
      if (match) {
        const a = match.teamA?.name ?? 'Čeka se';
        const b = match.teamB?.name ?? 'Čeka se';
        this.title.setTitle(`Sudija · ${a} vs ${b} · EsportsHub`);
      }
    });
  }

  protected step(side: 'A' | 'B', delta: number): void {
    const draft = side === 'A' ? this.draftA : this.draftB;
    draft.set(Math.max(0, draft() + delta));
    this.saved.set(false);
  }

  protected start(): void {
    this.run('start', this.matchesApi.start(this.store.id()));
  }

  protected saveScore(): void {
    this.run(
      'score',
      this.matchesApi.updateScore(this.store.id(), this.draftA(), this.draftB()),
      () => {
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 2000);
      },
    );
  }

  protected finish(): void {
    if (this.tie()) {
      return;
    }
    this.run('finish', this.matchesApi.finish(this.store.id(), this.draftA(), this.draftB()), () =>
      this.store.bracket.reload(),
    );
  }

  protected retry(): void {
    this.store.reload();
  }

  private run(action: Action, request: Observable<BracketMatch>, done?: () => void): void {
    this.busy.set(action);
    this.errors.set({});
    request.subscribe({
      next: (match) => {
        this.busy.set(null);
        this.store.setMatch(match);
        done?.();
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.errors.set({ [action]: toApiError(error).message });
      },
    });
  }
}
