import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ConnectionIndicator } from '../../shared/connection-indicator/connection-indicator';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { MatchFeed } from './match-feed';
import { MatchLiveStore } from './match-live-store';
import { MatchScoreboard } from './match-scoreboard';
import { MatchStats } from './match-stats';

@Component({
  selector: 'app-mec',
  imports: [
    RouterLink,
    ConnectionIndicator,
    ErrorState,
    Skeleton,
    MatchFeed,
    MatchScoreboard,
    MatchStats,
  ],
  providers: [MatchLiveStore],
  templateUrl: './mec.html',
  styleUrl: './mec.scss',
})
export default class Mec {
  private readonly store = inject(MatchLiveStore);
  private readonly title = inject(Title);

  protected readonly realtime = this.store.realtime;
  protected readonly match = this.store.match;
  protected readonly snapshot = this.store.snapshot;
  protected readonly loadError = this.store.loadError;
  protected readonly tournament = this.store.tournament;
  protected readonly eyebrow = this.store.eyebrow;
  protected readonly feed = this.store.feed;
  protected readonly statusLabel = this.store.statusLabel;
  protected readonly live = this.store.live;
  protected readonly clock = this.store.clock;

  constructor() {
    const id = toSignal(
      inject(ActivatedRoute).paramMap.pipe(map((params) => Number(params.get('id')))),
      {
        requireSync: true,
      },
    );
    this.store.connect(id);

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
    this.store.reload();
  }
}
