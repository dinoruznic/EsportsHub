import { Component, input } from '@angular/core';
import { FeedEntry } from './match-events';

@Component({
  selector: 'app-match-feed',
  template: `
    <h2 class="heading">Događaji</h2>
    @if (entries().length === 0) {
      <p class="empty">Još nema događaja.</p>
    } @else {
      <ol class="list">
        @for (entry of entries(); track entry.key) {
          <li class="entry" [attr.data-type]="entry.type">
            <span class="num time">{{ entry.time }}</span>
            <span class="source" [attr.data-source]="entry.source">{{ entry.source }}</span>
            <span class="text">{{ entry.text }}</span>
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
      padding: 18px 20px;
    }

    .heading {
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .empty {
      color: var(--muted);
      font-size: 14px;
    }

    .list {
      display: grid;
      gap: 2px;
      max-height: 380px;
      margin: 0;
      padding: 0 4px 0 0;
      overflow-y: auto;
      list-style: none;
    }

    .entry {
      display: grid;
      grid-template-columns: 64px 64px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      padding: 9px 8px;
      border-bottom: 1px solid var(--line-soft);
      font-size: 13.5px;
      animation: enter 0.35s ease-out;
    }

    .time {
      color: var(--faint);
      font-size: 12px;
    }

    .source {
      justify-self: start;
      padding: 3px 6px;
      border: 1px solid var(--line);
      border-radius: 4px;
      color: var(--muted);
      font: 700 9.5px/1 var(--mono);
      letter-spacing: 0.08em;

      &[data-source='RIOT'] {
        border-color: rgb(77 141 247 / 0.5);
        color: var(--blue);
      }

      &[data-source='SUDIJA'] {
        border-color: rgb(226 177 84 / 0.5);
        color: var(--gold);
      }
    }

    .text {
      overflow-wrap: anywhere;
    }

    @keyframes enter {
      from {
        background: rgb(226 177 84 / 0.12);
      }
    }
  `,
})
export class MatchFeed {
  readonly entries = input.required<FeedEntry[]>();
}
