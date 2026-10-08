import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-drawer',
  template: `
    <div class="backdrop" (click)="close.emit()"></div>
    <aside
      #panel
      class="drawer"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      [attr.aria-label]="label()"
      (keydown)="onKeydown($event)"
    >
      <button type="button" class="close" aria-label="Zatvori panel" (click)="close.emit()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
      <ng-content />
    </aside>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: flex;
      justify-content: flex-end;
    }

    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(5 8 12 / 0.6);
      backdrop-filter: blur(2px);
      animation: fade 0.15s ease-out;
    }

    .drawer {
      position: relative;
      display: grid;
      align-content: start;
      gap: 18px;
      width: min(520px, 100%);
      height: 100%;
      padding: 26px 24px 32px;
      overflow-y: auto;
      border-left: 1px solid var(--line);
      background: var(--panel);
      box-shadow: -20px 0 40px rgb(0 0 0 / 0.4);
      animation: slide 0.2s ease-out;

      &:focus {
        outline: none;
      }
    }

    .close {
      position: absolute;
      top: 14px;
      right: 14px;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: transparent;
      color: var(--muted);
      cursor: pointer;

      &:hover {
        color: var(--text);
        background: var(--raise);
      }

      svg {
        width: 16px;
        height: 16px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
      }
    }

    @keyframes slide {
      from {
        transform: translateX(40px);
        opacity: 0;
      }
    }

    @keyframes fade {
      from {
        opacity: 0;
      }
    }
  `,
})
export class Drawer {
  readonly label = input('Panel');
  readonly close = output<void>();

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);

  constructor() {
    const previous = this.document.activeElement as HTMLElement | null;
    afterNextRender(() => {
      const first = this.focusable()[1] ?? this.panel().nativeElement;
      first.focus();
    });
    inject(DestroyRef).onDestroy(() => previous?.focus?.());
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close.emit();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = this.focusable();
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.document.activeElement;
    if (event.shiftKey && (active === first || active === this.panel().nativeElement)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusable(): HTMLElement[] {
    return Array.from(this.panel().nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE));
  }
}
