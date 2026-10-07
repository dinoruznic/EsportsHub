import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament, formatLabel } from '../../core/api/models';
import { formatDate, formatKm } from '../../shared/format';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { StatusChip } from '../../shared/status-chip/status-chip';

@Component({
  selector: 'app-tournament-card',
  imports: [RouterLink, GameBadge, StatusChip],
  template: `
    @let t = tournament();
    <a class="card" [routerLink]="['/turniri', t.id]" [attr.data-tournament-id]="t.id">
      <div class="top">
        <app-game-badge [code]="t.gameCode" [name]="gameName()" />
        <app-status-chip [status]="t.status" />
      </div>
      <h2 class="name">{{ t.name }}</h2>
      <p class="format">{{ format() }}</p>
      <div class="fill">
        <span class="fill-label">Timovi</span>
        <span class="num count">{{ fill() }}</span>
        @if (t.maxTeams) {
          <span class="bar"><span [style.width.%]="percent()"></span></span>
        }
      </div>
      <dl class="meta">
        @if (prize(); as prize) {
          <div><dt>Nagradni fond</dt><dd class="num prize">{{ prize }}</dd></div>
        }
        @if (start(); as start) {
          <div><dt>Početak</dt><dd>{{ start }}</dd></div>
        }
        <div><dt>Organizator</dt><dd>{{ t.organizerUsername }}</dd></div>
      </dl>
    </a>
  `,
  styleUrl: './tournament-card.scss',
})
export class TournamentCard {
  readonly tournament = input.required<Tournament>();
  readonly gameName = input<string | null>(null);
  readonly registered = input<number | null>(null);

  protected readonly format = computed(() => formatLabel(this.tournament().format));
  protected readonly prize = computed(() => {
    const prize = this.tournament().prizePool;
    return prize === null || prize === undefined ? null : formatKm(prize);
  });
  protected readonly start = computed(() => {
    const start = this.tournament().startDate;
    return start ? formatDate(start) : null;
  });
  protected readonly fill = computed(() => {
    const count = this.registered() ?? '–';
    const max = this.tournament().maxTeams;
    return max ? `${count}/${max} timova` : `${count} prijavljeno`;
  });
  protected readonly percent = computed(() => {
    const max = this.tournament().maxTeams ?? 0;
    return max > 0 ? Math.min(100, ((this.registered() ?? 0) / max) * 100) : 0;
  });
}
