import { Component, input } from '@angular/core';
import { ClockView } from './match-format';

@Component({
  selector: 'app-live-clock',
  template: `
    @let v = view();
    <span class="chip" [attr.data-state]="v.state">
      @if (v.state === 'live') {
        <span class="dot" aria-hidden="true"></span>
      }
      @if (v.time) {
        <span class="num clock-time">{{ v.time }}</span>
      } @else {
        <span class="clock-wait">{{ v.note }}</span>
      }
    </span>
    @if (v.time && v.note) {
      <span class="clock-note">{{ v.note }}</span>
    }
  `,
  host: {
    class: 'live-clock',
    '[attr.data-state]': 'view().state',
    '[class.large]': 'large()',
  },
  styles: `
    :host {
      display: grid;
      justify-items: center;
      align-content: start;
      gap: 5px;
      min-height: 48px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 28px;
      padding: 0 10px;
      border: 1px solid rgb(255 67 87 / 0.45);
      border-radius: 6px;
      background: rgb(255 67 87 / 0.1);
      color: var(--live);

      &[data-state='stale'],
      &[data-state='waiting'] {
        border-color: var(--line);
        background: transparent;
        color: var(--muted);
      }
    }

    .clock-time {
      font-size: 14px;
      font-weight: 700;
    }

    .clock-wait {
      font-size: 12px;
      font-weight: 600;
    }

    .clock-note {
      color: var(--muted);
      font-size: 11.5px;
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--live);
      box-shadow: 0 0 8px var(--live);
      animation: pulse 1.2s ease-in-out infinite;
    }

    :host(.large) {
      min-height: 58px;

      .chip {
        height: 36px;
        padding: 0 14px;
      }

      .clock-time {
        font-size: 20px;
      }

      .clock-wait {
        font-size: 13px;
      }

      .clock-note {
        font-size: 12.5px;
      }
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }
  `,
})
export class LiveClock {
  readonly view = input.required<ClockView>();
  readonly large = input(false);
}
