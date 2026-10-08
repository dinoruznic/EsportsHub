import { Component, input } from '@angular/core';
import { Highlights } from './bracket/bracket-layout';

@Component({
  selector: 'app-match-highlights',
  template: `
    @let h = highlights();
    <span class="label" [class.live]="h.live">
      @if (h.live) {
        <span class="dot" aria-hidden="true"></span>
        Uživo sada
      } @else {
        Sljedeći meč
      }
    </span>
    <ul class="chips">
      @for (chip of h.chips; track chip.id) {
        <li class="chip" [attr.data-match-id]="chip.id">
          <span class="team">{{ chip.teamA }}</span>
          @if (h.live) {
            <span class="num score">{{ chip.scoreA ?? 0 }} : {{ chip.scoreB ?? 0 }}</span>
          } @else {
            <span class="vs">vs</span>
          }
          <span class="team">{{ chip.teamB }}</span>
          <span class="round">· {{ chip.round }}</span>
        </li>
      }
    </ul>
  `,
  host: { class: 'match-highlights' },
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 14px;
      min-height: 44px;
      padding: 6px 12px;
      border: 1px solid var(--line-soft);
      border-radius: 10px;
      background: var(--panel);
    }

    .label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--muted);
      font: 700 11px/1 var(--mono);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      white-space: nowrap;

      &.live {
        color: var(--live);
      }
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--live);
      box-shadow: 0 0 8px var(--live);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      min-width: 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      max-width: 100%;
      height: 30px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--panel-2);
      font-size: 13px;
      white-space: nowrap;
    }

    .team {
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
    }

    .score {
      color: var(--text);
      font-weight: 700;
    }

    .vs,
    .round {
      color: var(--faint);
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }
  `,
})
export class MatchHighlights {
  readonly highlights = input.required<Highlights>();
}
