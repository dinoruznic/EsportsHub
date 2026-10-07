import { Component, computed, input } from '@angular/core';
import { TournamentStatus } from '../../core/api/models';

const LABELS: Record<TournamentStatus, string> = {
  PENDING: 'Na odobrenju',
  REGISTRATION: 'Prijave otvorene',
  ONGOING: 'U toku',
  COMPLETED: 'Završen',
  REJECTED: 'Odbijen',
  CANCELLED: 'Otkazan',
};

export function statusLabel(status: TournamentStatus): string {
  return LABELS[status] ?? status;
}

@Component({
  selector: 'app-status-chip',
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: {
    class: 'status-chip',
    '[attr.data-status]': 'status()',
  },
  styles: `
    :host {
      --chip: var(--muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 24px;
      padding: 0 9px;
      border: 1px solid color-mix(in srgb, var(--chip) 40%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--chip) 12%, transparent);
      color: var(--chip);
      font: 600 10.5px/1 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    :host([data-status='REGISTRATION']) {
      --chip: var(--good);
    }

    :host([data-status='ONGOING']) {
      --chip: var(--live);
    }

    :host([data-status='COMPLETED']),
    :host([data-status='CANCELLED']) {
      --chip: var(--faint);
    }

    :host([data-status='REJECTED']) {
      --chip: var(--red);
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    :host([data-status='ONGOING']) .dot {
      animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
        transform: scale(0.7);
      }
    }
  `,
})
export class StatusChip {
  readonly status = input.required<TournamentStatus>();
  protected readonly label = computed(() => statusLabel(this.status()));
}
