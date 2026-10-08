import { Component, computed, input } from '@angular/core';

const LABELS: Record<string, string> = {
  SCHEDULED: 'Zakazan',
  LIVE: 'Uživo',
  FINISHED: 'Završen',
  CANCELLED: 'Otkazan',
};

@Component({
  selector: 'app-match-status',
  template: `
    @if (status() === 'LIVE') {
      <span class="dot" aria-hidden="true"></span>
    }
    {{ label() }}
  `,
  host: { class: 'match-status-chip', '[attr.data-status]': 'status()' },
  styles: `
    :host {
      --chip: var(--muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 24px;
      padding: 0 10px;
      border: 1px solid color-mix(in srgb, var(--chip) 40%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--chip) 12%, transparent);
      color: var(--chip);
      font: 700 10.5px/1 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    :host([data-status='LIVE']) {
      --chip: var(--live);
    }

    :host([data-status='FINISHED']),
    :host([data-status='CANCELLED']) {
      --chip: var(--faint);
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--live);
      box-shadow: 0 0 8px var(--live);
      animation: pulse 1.2s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }
  `,
})
export class MatchStatus {
  readonly status = input.required<string>();
  protected readonly label = computed(() => LABELS[this.status()] ?? this.status());
}
