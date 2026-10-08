import { Component, computed, input } from '@angular/core';
import { Registration } from '../../core/api/models';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { Placement } from './bracket/bracket-layout';

@Component({
  selector: 'app-registered-teams',
  imports: [TeamHex],
  template: `
    @if (placements(); as ranking) {
      <h2 class="heading">Konačni plasman</h2>
      <ol class="list">
        @for (row of ranking; track row.registration.id) {
          <li
            class="team placed"
            [class.out]="row.kind === 'eliminated'"
            [attr.data-team-id]="row.registration.teamId"
            [attr.data-kind]="row.kind"
          >
            <app-team-hex
              [teamId]="row.registration.teamId"
              [label]="row.registration.teamTag"
              [size]="24"
            />
            <span class="who">
              <span class="name">{{ row.registration.teamName }}</span>
              <span class="num place">{{ row.label }}</span>
            </span>
            <span class="num tag">{{ row.registration.teamTag }}</span>
          </li>
        }
      </ol>
    } @else {
      <h2 class="heading">
        Prijavljeni timovi
        <span class="num count">{{ teams().length }} / {{ maxTeams() ?? '∞' }}</span>
      </h2>
      @if (teams().length === 0 && openSeats().length === 0) {
        <p class="none">Još nijedan tim nije prijavljen.</p>
      } @else {
        <ol class="list">
          @for (team of teams(); track team.id) {
            <li class="team filled" [attr.data-team-id]="team.teamId">
              <span class="num seed">{{ team.seed }}</span>
              <app-team-hex [teamId]="team.teamId" [label]="team.teamTag" [size]="24" />
              <span class="name">{{ team.teamName }}</span>
              <span class="num tag">{{ team.teamTag }}</span>
            </li>
          }
          @for (seat of openSeats(); track seat) {
            <li class="team open">
              <span class="num seed">{{ seat }}</span>
              <app-team-hex [size]="24" />
              <span class="name">Slobodno mjesto</span>
            </li>
          }
        </ol>
      }
    }
  `,
  host: { class: 'panel' },
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: 12px;
      padding: 16px;
    }

    .heading .count {
      font: 700 13px/1 var(--mono);
    }

    .heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 10px;
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .count {
      color: var(--gold);
      font-size: 12px;
    }

    .none {
      color: var(--muted);
      font-size: 13px;
    }

    .list {
      display: grid;
      gap: 4px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .team {
      display: grid;
      grid-template-columns: 18px 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      height: 44px;
      padding: 0 10px;
      border-radius: 7px;
      background: var(--panel-2);
      font-size: 14px;
      transition: background-color 0.15s ease;
    }

    .team:hover {
      background: var(--raise);
    }

    .team.open {
      border: 1px dashed var(--line);
      background: transparent;
    }

    .team.open .name {
      color: var(--faint);
      font-style: italic;
      font-weight: 400;
    }

    .team.placed {
      grid-template-columns: 24px minmax(0, 1fr) auto;
      height: 52px;
    }

    .team.out .who {
      opacity: 0.7;
    }

    .who {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    .place {
      color: var(--faint);
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    [data-kind='champion'] .place,
    [data-kind='champion'] .name {
      color: var(--gold);
    }

    [data-kind='finalist'] .place {
      color: #c9d1dc;
    }

    .seed {
      color: var(--faint);
      font-size: 11px;
    }

    .name {
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag {
      color: var(--faint);
      font-size: 11px;
    }
  `,
})
export class RegisteredTeams {
  readonly registrations = input.required<Registration[]>();
  readonly maxTeams = input<number | null>(null);
  readonly placements = input<Placement[] | null>(null);

  protected readonly openSeats = computed(() => {
    const free = (this.maxTeams() ?? 0) - this.registrations().length;
    return Array.from(
      { length: Math.max(0, free) },
      (_, index) => this.registrations().length + index + 1,
    );
  });

  protected readonly teams = computed(() =>
    this.registrations().map((registration, index) => ({
      ...registration,
      seed: registration.seed ?? index + 1,
    })),
  );
}
