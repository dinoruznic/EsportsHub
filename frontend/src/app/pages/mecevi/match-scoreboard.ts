import { Component, computed, input } from '@angular/core';
import { BracketMatch } from '../../core/api/models';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { LiveClock } from './live-clock';
import { ClockView } from './match-format';

@Component({
  selector: 'app-match-scoreboard',
  imports: [TeamHex, LiveClock],
  template: `
    @let m = match();
    <div class="side blue" [class.won]="finished() && m.teamA && m.winnerTeamId === m.teamA.id">
      <span class="side-label">Blue side</span>
      @if (m.teamA; as team) {
        <app-team-hex [teamId]="team.id" [label]="team.tag || team.name" [size]="hexSize()" />
        <p class="team-name">{{ team.name }}</p>
        <span class="num tag">{{ team.tag }}</span>
      } @else {
        <app-team-hex [size]="hexSize()" />
        <p class="team-name tbd">Čeka se</p>
      }
    </div>

    <div class="center">
      <div class="series num">
        <span [class.lead]="(m.scoreA ?? 0) > (m.scoreB ?? 0)">{{ m.scoreA ?? 0 }}</span>
        <span class="colon">:</span>
        <span [class.lead]="(m.scoreB ?? 0) > (m.scoreA ?? 0)">{{ m.scoreB ?? 0 }}</span>
      </div>
      @if (live()) {
        <app-live-clock [view]="clock()" [large]="!compact()" />
      } @else {
        <div class="state">{{ statusLabel() }}</div>
      }
    </div>

    <div class="side red" [class.won]="finished() && m.teamB && m.winnerTeamId === m.teamB.id">
      <span class="side-label">Red side</span>
      @if (m.teamB; as team) {
        <app-team-hex [teamId]="team.id" [label]="team.tag || team.name" [size]="hexSize()" />
        <p class="team-name">{{ team.name }}</p>
        <span class="num tag">{{ team.tag }}</span>
      } @else {
        <app-team-hex [size]="hexSize()" />
        <p class="team-name tbd">Čeka se</p>
      }
    </div>
  `,
  host: {
    class: 'scoreboard panel',
    role: 'region',
    'aria-label': 'Rezultat',
    '[class.is-live]': 'live()',
    '[class.compact]': 'compact()',
  },
  styleUrl: './match-scoreboard.scss',
})
export class MatchScoreboard {
  readonly match = input.required<BracketMatch>();
  readonly clock = input.required<ClockView>();
  readonly statusLabel = input('');
  readonly compact = input(false);

  protected readonly live = computed(() => this.match().status === 'LIVE');
  protected readonly finished = computed(() => this.match().status === 'FINISHED');
  protected readonly hexSize = computed(() => (this.compact() ? 44 : 76));
}
