import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../../core/api/models';
import { formatDate, formatKm } from '../../shared/format';
import { StatusChip } from '../../shared/status-chip/status-chip';

@Component({
  selector: 'app-tournament-stats',
  imports: [RouterLink, StatusChip],
  template: `
    @let t = tournament();
    <dl class="cells">
      <div class="cell status">
        <dt>Status</dt>
        <dd><app-status-chip [status]="t.status" /></dd>
        @if (note(); as note) {
          <dd class="note">{{ note }}</dd>
        }
      </div>
      <div class="cell teams">
        <dt>Timovi</dt>
        <dd>
          <span class="num">{{ teams() }}</span>
          @if (t.maxTeams) {
            <span class="bar"><span [style.width.%]="percent()"></span></span>
          }
        </dd>
      </div>
      <div class="cell">
        <dt>Nagradni fond</dt>
        <dd class="num" [class.prize]="prize() !== '—'">{{ prize() }}</dd>
      </div>
      <div class="cell">
        <dt>Početak</dt>
        <dd>{{ start() }}</dd>
      </div>
      <div class="cell">
        <dt>Organizator</dt>
        <dd class="organizer">
          <a class="player" [routerLink]="['/igraci', t.organizerUsername]">{{
            t.organizerUsername
          }}</a>
        </dd>
      </div>
    </dl>
    <div class="actions"><ng-content /></div>
  `,
  host: { class: 'panel' },
  styleUrl: './tournament-stats.scss',
})
export class TournamentStats {
  readonly tournament = input.required<Tournament>();
  readonly registered = input(0);
  readonly note = input<string | null>(null);

  protected readonly teams = computed(() => {
    const max = this.tournament().maxTeams;
    return max ? `${this.registered()} / ${max}` : `${this.registered()}`;
  });
  protected readonly percent = computed(() => {
    const max = this.tournament().maxTeams ?? 0;
    return max > 0 ? Math.min(100, (this.registered() / max) * 100) : 0;
  });
  protected readonly prize = computed(() => {
    const prize = this.tournament().prizePool;
    return prize === null || prize === undefined ? '—' : formatKm(prize);
  });
  protected readonly start = computed(() => {
    const start = this.tournament().startDate;
    return start ? formatDate(start) : '—';
  });
}
