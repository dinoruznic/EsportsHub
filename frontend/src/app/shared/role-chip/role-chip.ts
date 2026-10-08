import { Component, computed, input } from '@angular/core';
import { roleLabel } from '../../core/auth/roles';

@Component({
  selector: 'app-role-chip',
  template: `{{ label() }}`,
  host: {
    class: 'role-chip',
    '[attr.data-role]': 'role()',
    '[class.large]': 'large()',
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding: 3px 6px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--panel-2);
      color: var(--muted);
      font: 500 10px/1 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    :host(.large) {
      height: 26px;
      padding: 0 8px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 600;
    }

    :host([data-role='ADMIN']) {
      border-color: rgb(226 177 84 / 0.55);
      background: rgb(226 177 84 / 0.12);
      color: var(--gold);
    }
  `,
})
export class RoleChip {
  readonly role = input.required<string>();
  readonly large = input(false);

  protected readonly label = computed(() => roleLabel(this.role()));
}
