import { Component, computed, input } from '@angular/core';
import { ConnectionState } from '../../core/realtime/realtime.service';

const LABELS: Record<ConnectionState, string> = {
  connected: 'Uživo · povezano',
  connecting: 'Povezivanje…',
  reconnecting: 'Ponovno povezivanje…',
  offline: 'Bez veze',
};

@Component({
  selector: 'app-connection-indicator',
  template: `<span class="dot" aria-hidden="true"></span>{{ label() }}`,
  host: { class: 'connection-indicator', role: 'status', '[attr.data-state]': 'state()' },
  styles: `
    :host {
      --tone: #e0a63a;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: var(--muted);
      font: 500 11px/1 var(--mono);
      letter-spacing: 0.06em;
      white-space: nowrap;
    }

    :host([data-state='connected']) {
      --tone: var(--good);
    }

    :host([data-state='offline']) {
      --tone: var(--red);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--tone);
      box-shadow: 0 0 8px var(--tone);
    }

    :host([data-state='connecting']) .dot,
    :host([data-state='reconnecting']) .dot {
      animation: blink 1s ease-in-out infinite;
    }

    @keyframes blink {
      50% {
        opacity: 0.3;
      }
    }
  `,
})
export class ConnectionIndicator {
  readonly state = input.required<ConnectionState>();
  protected readonly label = computed(() => LABELS[this.state()]);
}
