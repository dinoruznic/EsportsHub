import { Component, computed, input } from '@angular/core';

const LABELS: Record<string, string> = {
  PENDING: 'Na čekanju',
  ACCEPTED: 'Prihvaćena',
  REJECTED: 'Odbijena',
  WITHDRAWN: 'Povučena',
};

@Component({
  selector: 'app-offer-status',
  template: `{{ label() }}`,
  host: { class: 'offer-status', '[attr.data-status]': 'status()' },
  styles: `
    :host {
      --chip: var(--faint);
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 9px;
      border: 1px solid color-mix(in srgb, var(--chip) 45%, transparent);
      border-radius: 999px;
      background: color-mix(in srgb, var(--chip) 12%, transparent);
      color: var(--chip);
      font: 700 10px/1 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    :host([data-status='PENDING']) {
      --chip: var(--gold);
    }

    :host([data-status='ACCEPTED']) {
      --chip: var(--good);
    }

    :host([data-status='REJECTED']) {
      --chip: var(--red);
    }
  `,
})
export class OfferStatus {
  readonly status = input.required<string>();
  protected readonly label = computed(() => LABELS[this.status()] ?? this.status());
}
