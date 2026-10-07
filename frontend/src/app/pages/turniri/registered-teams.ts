import { Component, computed, input } from '@angular/core';
import { Registration } from '../../core/api/models';

@Component({
  selector: 'app-registered-teams',
  template: `
    <h2 class="heading">
      Prijavljeni timovi
      <span class="num count">{{ teams().length }} / {{ maxTeams() ?? '∞' }}</span>
    </h2>
    @if (teams().length === 0) {
      <p class="none">Još nijedan tim nije prijavljen.</p>
    } @else {
      <ol class="list">
        @for (team of teams(); track team.id) {
          <li class="team" [attr.data-team-id]="team.teamId">
            <span class="num seed">{{ team.seed }}</span>
            <span class="name">{{ team.teamName }}</span>
            <span class="num tag">{{ team.teamTag }}</span>
          </li>
        }
      </ol>
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
      grid-template-columns: 24px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      background: var(--panel-2);
      font-size: 13.5px;
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
      color: var(--muted);
      font-size: 11px;
    }
  `,
})
export class RegisteredTeams {
  readonly registrations = input.required<Registration[]>();
  readonly maxTeams = input<number | null>(null);

  protected readonly teams = computed(() =>
    this.registrations().map((registration, index) => ({
      ...registration,
      seed: registration.seed ?? index + 1,
    })),
  );
}
